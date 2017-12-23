// app.js
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var request = require('request');
var url = 'https://api.turkishairlines.com/test/searchpassenger';

var io = require('socket.io')(server);

var questions = [
    {
        'question': 'question1',
        'answers': ['answer1', 'answer2', 'answer3', 'answer4'],
        'answersCount': [[], [], [], []],
        'correctAnswer': 1,
        'score': 0
    },
    {
        'question': 'question2',
        'answers': ['answer1', 'answer2', 'answer3', 'answer4'],
        'answersCount': [[], [], [], []],
        'correctAnswer': 3,
        'score': 0
    },
    {
        'question': 'question3',
        'answers': ['answer1', 'answer2', 'answer3', 'answer4'],
        'answersCount': [[], [], [], []],
        'correctAnswer': 0,
        'score': 0

    },
    // {
    //     'question': 'question4',
    //     'answers': ['answer1', 'answer2', 'answer3', 'answer4'],
    //     'answersCount': [[], [], [], []],
    //     'correctAnswer': 2,
    //     'score': 0

    // },
    // {
    //     'question': 'question5',
    //     'answers': ['answer1', 'answer2', 'answer3', 'answer4'],
    //     'answersCount': [[], [], [], []],
    //     'correctAnswer': 1,
    //     'score': 0

    // }

]

app.use(express.static(__dirname + '/node_modules'));
app.use('/assets', express.static(__dirname + '/assets'));

app.get('/', function (req, res, next) {
    res.sendFile(__dirname + '/login.html');
});

app.get('/screen', function (req, res, next) {
    res.sendFile(__dirname + '/screen.html');
});

app.get('/mobile', function (req, res, next) {
    res.sendFile(__dirname + '/mobile.html');

});

app.get('/login', function (req, res, next) {
    console.log("Login geldi");
    res.sendFile(__dirname + '/mobile.html');

});

app.post('/login-post', function (req, res, next) {
    console.log("Login geldi");
    // console.log("Login data: ", data);
    // var queryParams = '?' + encodeURIComponent('lastname') + '=' + encodeURIComponent('YILMAZ') + '&' + encodeURIComponent('pnr') + '=' + encodeURIComponent('AHK34D') + '&' + encodeURIComponent('name') + '=' + encodeURIComponent(data.name) + '&' + encodeURIComponent('title') + '=' + encodeURIComponent(data.title);
    // var r = request({
    //     url: url + queryParams,
    //     headers: { 'apisecret': '885c340e96ac4c7a9638c021ccbe8a01', 'apikey': 'l7xxf90f2f436d3b48bba2a0d0ef5aec7008' },
    //     method: 'GET'
    // }, function (error, response, body) {
    //     console.log("body:", body);
    //     if (data.tc == JSON.parse(body).data.TripData.PassengerFlightInfoList.PassengerFlightInfo.IdInformation.TCKIdNumber) {
    //         // res.redirect('/mobile');
    //     }
    // });
    res.redirect('/mobile');
});

users = {}
var currentQuestion = 0;
var started = false;
io.on('connection', function (client) {

    client.on('login', function (data) {
        if (started && currentQuestion != 0) {
            client.emit('cannot_start', true);
            client.disconnect();
        } else {
            users[data] = { 'score': 0, 'true_questions': 0 }
        }

    });

    client.on('disconnect', function (data) {
        delete users[data];
    });

    client.on('answer', function (data) {
        if (started) {

            var score = 0;
            var time = (Date.now() - questions[currentQuestion - 1].time);

            // puan hesaplatma
            if (data.answer === questions[currentQuestion - 1].correctAnswer) {
                if (time / 1000.0 < 2) score = 10 * 1.5;
                else if (time / 1000.0 < 5) score = 10 * 1.4;
                else if (time / 1000.0 < 8) score = 10 * 1.3;
                else if (time / 1000.0 < 12) score = 10 * 1.2;
                else if (time / 1000.0 < 16) score = 10 * 1.1;
                else if (time / 1000.0 <= 22) score = 10;
            }

            users[data.tck].score += score;
            questions[currentQuestion - 1].answersCount[data.answer].push({
                'tck': data.tck,
                'score': score
            });
        }


    });

    client.on('send_score', function (data) {
        client.emit('score', users[data].score);
    });

    client.on('start', function (data) {
        if (currentQuestion == 0) started = true;
        if (questions.length != currentQuestion) {
            client.emit('question', questions[currentQuestion]);
            questions[currentQuestion].time = Date.now();
            client.broadcast.emit('question', currentQuestion + 1);
            currentQuestion++;
        }
        else {
            client.emit('finish', users);
        }
    });

    client.on('result', function (data) {
        client.emit('results', {
            'correctAnswer': questions[currentQuestion - 1].correctAnswer,
            'answersCount': questions[currentQuestion - 1].answersCount
        });
        client.broadcast.emit('results', true);

    })

    //SERDAR /mobile a yönlendir
    client.on('loginData', function (data) {



    })
    /////////////77
})

// server.listen(3000,'10.0.16.212');


// '10.0.16.212'
server.listen(3000, '10.0.16.212', function () {
    console.log('listening on *:3000');
});

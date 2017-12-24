

// app.js
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var request = require('request');
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var url = 'https://api.turkishairlines.com/test/searchpassenger';
var io = require('socket.io')(server);
app.use(cookieParser());

var questions = [
    {
        'question': 'Avrupa Birliğine bağlı kaç ülke vardır?',
        'answers': ['27', '28', '29', '30'],
        'answersCount': [[], [], [], []],
        'correctAnswer': 1,
        'score': 0
    },
    {
        'question': 'Ayda hangi sıklıkla uçarsınız?',
        'answers': ['2den az', '2-4', '4 ile 7', '7den fazla'],
        'answersCount': [[], [], [], []],
        'correctAnswer': -1,
        'score': 0
    },
    {
        'question': 'Yolcularımızın yüzde kaçı ayda 2 uçuşdan daha az sefer yapmaktadır?',
        'answers': ['<25', '25-49', '50-74', '>75'],
        'answersCount': [[], [], [], []],
        'correctAnswer': 3,
        'score': 0

    },
    {
        'question': 'Aşağıdakilerden hangisi veya hangileri 2017 THY Hackathon yarışmasında sponsordur?',
        'answers': ['Turkcell', 'Microsoft', 'Sabre', 'Hepsi'],
        'answersCount': [[], [], [], []],
        'correctAnswer': 3,
        'score': 0

    },
    {
        'question': 'Uçak içerisindeki acil durum ışıkları hangi renktir?',
        'answers': ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı'],
        'answersCount': [[], [], [], []],
        'correctAnswer': 0,
        'score': 0

    }

]
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json())


app.use(express.static(__dirname + '/node_modules'));
app.use('/assets', express.static(__dirname + '/assets'));

app.get('/', function (req, res, next) {
    res.sendFile(__dirname + '/mobile.html');
});

app.get('/screen', function (req, res, next) {
    res.sendFile(__dirname + '/screen.html');
});

app.get('/mobile', function (req, res, next) {
    console.log(req.cookies.pnr);
    res.sendFile(__dirname + '/mobile.html');

});

app.get('/login', function (req, res, next) {
    console.log("Login geldi");
    res.sendFile(__dirname + '/login.html');

});

app.post('/login-post', function (req, res, next) {
    console.log("Login datası: ", req.body);
    res.cookie('pnr', req.body.pnr, { maxAge: 900000, httpOnly: true });
    res.cookie('name', req.body.name, { maxAge: 900000, httpOnly: true });
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

var sorted = [];




users = {}
var currentQuestion = 0;
var started = false;
io.on('connection', function (client) {

    client.on('login', function (data) {
        if (started && currentQuestion != 0) {
            client.emit('cannot_start', true);
            client.disconnect();
        } else {
            users[data.pnr] = { 'score': 0, 'true_questions': 0, 'name': data.name }
            client.emit('user_logged', data.name);
            client.broadcast.emit('user_logged', data.name);
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
            if ((data.answer === questions[currentQuestion - 1].correctAnswer) && questions[currentQuestion - 1].correctAnswer != -1) {
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

            function compare(a, b) {
                // Use toUpperCase() to ignore character casing
                const genreA = a.score;
                const genreB = b.score;

                let comparison = 0;
                if (genreA > genreB) {
                    comparison = -1;
                } else if (genreA < genreB) {
                    comparison = 1;
                }
                return comparison;
            }

            var users_ = [];
            for (var i in users) {
                users_.push({ 'name': users[i].name, 'score': users[i].score });
            }
            users_.sort(compare);
            client.emit('finish', { 'users': users_ });
            client.broadcast.emit('finish', { 'users': users_ });
        }
    });

    client.on('result', function (data) {

        if(questions[currentQuestion - 1].correctAnswer == -1) {
            console.log(questions[currentQuestion - 1].correctAnswer);
            var total = questions[currentQuestion - 1].answersCount[0].length + questions[currentQuestion - 1].answersCount[1].length + questions[currentQuestion - 1].answersCount[2].length + questions[currentQuestion - 1].answersCount[3].length;
            var correctAnswer = (questions[currentQuestion - 1].answersCount[0].length / total) * 100;
            if(questions[currentQuestion - 1].answersCount[0].length == 0) correctAnswer = 0;
            console.log(correctAnswer);
            if(correctAnswer < 25) questions[currentQuestion].correctAnswer = 0;
            else if (correctAnswer < 50) questions[currentQuestion].correctAnswer = 1; 
            else if (correctAnswer < 75) questions[currentQuestion].correctAnswer = 2;
            else if (correctAnswer < 101) questions[currentQuestion].correctAnswer = 3;
            console.log(questions[currentQuestion].correctAnswer);

        }



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

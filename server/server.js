// Questions and answers
var Ably = require('ably')
var numOfPlayers = 0;
var index = -1;
var currentQuestion = '';
var clientAid = '';
var clientBid = '';
var clientApublishChannel;
var clientBpublishChannel;
var currentChoices = [];
var questions = [
    {
        question: "What is a malicious program that is disguised as a legitimate software?",
        choices: ['Nemean Lion', 'Thor\'s Hammer', 'Trojan Horse', 'Golden Fleece'],
        correct: 2,
        pic: "https://www.hs-academypages.com/hubfs/lp/academy/trojan.png?t=1533931401700"
    },
    {
        question: "Which of the following shooter series is published by EA?",
        choices: ['Call Of Duty', 'Fortnite', 'Halo', 'Battlefield'],
        correct: 3,
        pic: "https://221728.selcdn.ru/digpay/2018/03/1-1.jpg"
    },
    {
        question: "Which of these is largest in memory terms",
        choices: ['Megabyte', 'Gigabyte', "Terabyte", "Kilobyte"],
        correct: 2,
        pic: "https://i.ytimg.com/vi/-aVhta7db2o/maxresdefault.jpg"
    },
    {
        question: "By default, most web browsers use which colour to denote a hyperlink?",
        choices: ['Blue', 'Green', 'Maroon', 'Red'],
        correct: 0,
        pic: "http://www.martinimanna.com/wp-content/uploads/2016/09/New-Mobile-Hyperlink-Allows-Apps-To-Interact-Like-Webpages.jpg"
    },
    {
        question: '"E" in Amazon\'s EC2 stands for?',
        choices: ['Eclipse', 'Extra', 'Elastic', "Economical"],
        correct: 2,
        pic: "https://image.slidesharecdn.com/introductiontoamazonec2-150417052810-conversion-gate01/95/introduction-to-amazon-ec2-2-638.jpg?cb=1429250596"
    },
    {
        question: "What was the code name of Windows 95?",
        choices: ['Cairo', "Washington", "Whistler", "Chicago"],
        correct: 3,
        pic: "http://chicago.win95.googlepages.com/chic58s-1.gif"
    },
    {
        question: "Which of these holds true for websockets",
        choices: ['Bi-directional', 'Duplex', 'Persistent', 'All of the these'],
        correct: 3,
        pic: "https://assets.ably.io/assets/diagrams/realtime-intro-7dfe7b01a3c0e0e5a11b7580e8f026e9d88a681fad691ce9f46ba9f4be3bdaee.png"
    },
    {
        question: "What is another term for 'bespoke' software?",
        choices: ["Custom", "Free", "Expensive", "Open Source"],
        correct: 0,
        pic: "https://www.hexacta.com/wp-content/uploads/2016/09/custom-vs-packaged_productivity2.jpg"
    }
];

//ably initialisation stuff-----------
var apiKey = '<ABLY-API-KEY>';
var ably = new Ably.Realtime({
    key: apiKey
});
var broadcastChannel = ably.channels.get("cluster-x-broadcast");
var presenceChannel = ably.channels.get("cluster-x-presence");
//---------------------


///-------------------------------------------------------------------------

/* Start the Express.js web server */
const express = require('express'),
      app = express(),
      cookieParser = require('cookie-parser');

app.use(cookieParser());

/* Server static content from the root path to keep things simple */
app.use('/', express.static(__dirname));

/* Issue token requests to clients sending a request
   to the /auth endpoint */
/*app.get('/auth', function (req, res) {
  var tokenParams = {
      'clientId': uniqueId()
    };
  

  console.log("Authenticating client:", JSON.stringify(tokenParams));
  rest.auth.createTokenRequest(tokenParams, function(err, tokenRequest) {
    if (err) {
      res.status(500).send('Error requesting token: ' + JSON.stringify(err));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(tokenRequest));
    }
  });
});
*/

app.get('/', function (req, res) {
  
presenceChannel.presence.subscribe('enter', (member) => {
    var memberData = JSON.stringify(member);
    var memberJSON = JSON.parse(memberData);
    console.log('Player with ClientId ' + member.clientId + ' entered');
    if (numOfPlayers === 0) {
        //TODO CHECK CHANNEL NAME
        clientApublishChannel = ably.channels.get("PublishChannel" + member.clientId)
        clientAid = member.clientId

        numOfPlayers++
    }
    else if (numOfPlayers === 1) {
        clientBpublishChannel = ably.channels.get("PublishChannel" + member.clientId)
        clientBid = member.clientId
        numOfPlayers++
    }
    if (numOfPlayers === 2) {
        //setStartActive = true;
        broadcastChannel.publish('startGameTick', {
            'startGame': true
        })
        updateQuestion();
    }
})

function declareWinner() {
    var clientAscore = -1;
    var clientBscore = -1;
    var scoreReceived = 0;
    clientApublishChannel.subscribe('update', (data) => {
        var dataObj = JSON.parse(JSON.stringify(data))
        clientAscore = parseInt(dataObj.data.correct)
        scoreReceived++;
        calcWinner(scoreReceived, clientAscore, clientBscore)
    })
    clientBpublishChannel.subscribe('update', (data) => {
        var dataObj = JSON.parse(JSON.stringify(data))
        clientBscore = parseInt(dataObj.data.correct)
        scoreReceived++;
        calcWinner(scoreReceived, clientAscore, clientBscore)
    })

}

function calcWinner(x, a, b) {
    if (x == 2) {
        if (a > b) {
            broadcastChannel.publish('winner', {
                'winnerID': clientAid
            })
        } else {
            broadcastChannel.publish('winner', {
                'winnerID': clientBid
            })
        }
    } else {
        return;
    }
}

function updateQuestion() {
    timer();
    index++;
    console.log('QINDEX' + index)
    if (index === (questions.length)) {
        console.log('*****Questions done in server')
        broadcastChannel.publish('newQuestion', {
            'index': index
        })
        clearInterval(clock);
        declareWinner();
        return;
    } else {
        currentQuestion = questions[index].question;
        for (var i = 0; i < 4; i++) {
            currentChoices[i] = questions[index].choices[i];
        }
    };

    broadcastChannel.publish('newQuestion', {
        'index': index,
        'currentQuestion': currentQuestion,
        'choice0': currentChoices[0],
        'choice1': currentChoices[1],
        'choice2': currentChoices[2],
        'choice3': currentChoices[3]
    })
};
var mycount = 0;
function publishCorrectAnswer(index) {
    console.log('Publishing Correct Answer' + mycount++)
    var choiceNum = questions[index].correct
    broadcastChannel.publish('correctAnswer', {
        'index': index,
        'correctAnswerChoice': questions[index].choices[choiceNum],
        'correctPic': questions[index].pic,
        'correctChoiceIndex': choiceNum
    })
    updateQuestion();
}

// Timer function that handles the countdown
function timer() {
    time = 10;
    broadcastChannel.publish('timeUpdate', {
        'time': time,
        'timeout': 0
    });
    clock = setInterval(countdown, 1000);
    function countdown() {
        if (time > 1) {
            broadcastChannel.publish('timeUpdate', {
                'time': time,
                'timeout': 0
            });
            time--;
        } else {
            clearInterval(clock);
            broadcastChannel.publish('timeUpdate', {
                'time': time,
                'timeout': 1
            });
            publishCorrectAnswer(index)
        };
    };
};
  
      res.status(200).send('All OK');
    
})

var listener = app.listen(4001, function () {
  console.log('Your app is listening on port 4001');
});
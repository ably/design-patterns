// Initialize variables
var correct = 0;
var incorrect = 0;
var skipped = 0;
var index = 0;
var time = 0;
var currentAnswer;
var choiceClicked = false;
var currentUserChoice = -1
var currentQuestion = '';
var correctChoice;
var currentChoices = [];

//ably initialisation stuff-----------
var myId = "id-" + Math.random().toString(36).substr(2, 16)
var apiKey = '<ABLY-API-KEY>';
var ably = new Ably.Realtime({
    key: apiKey,
    clientId: myId
});
var broadcastChannel = ably.channels.get("cluster-x-broadcast");
var presenceChannel = ably.channels.get("cluster-x-presence");
var myPublishChannel = ably.channels.get("PublishChannel" + myId);


broadcastChannel.subscribe('newQuestion', newQuestionSubscription)
broadcastChannel.subscribe('startGameTick', startGameTickSubscription)

//---------------------

// Hide certain elements until game starts
$(document).ready(function () {
    $("#question-area").hide();
    $("#stats").hide();
    $("#end-area").hide();
    $("#wait-for-player").hide();
    $("#timer-div").hide();
    console.log('document ready')
    $("#click-to-start").on("click", function () {
        console.log('start clicked')
        presenceChannel.presence.enter();
        startGame();
    });

    $("#play-again").on("click", function () {
        window.location.reload();
    });

});

//enter presence and start when both players join
function startGame() {
    $("#click-to-start").hide();
    presenceChannel.presence.enter()
    $("#wait-for-player").show();

};

function startGameTickSubscription(data) {
    var dataObj = JSON.parse(JSON.stringify(data))
    //console.log('Object is', dataObj)
    if (dataObj.data.startGame)
        console.log('starting game')
    $("#wait-for-player").hide();
    updateQuestion();
}


// End game

function endGame() {
    $("#question-area").hide();
    $("#stats").hide();
    $("#end-area").show();
    $("#timer-div").hide();
    $(".correct-sofar").text(correct);
    $(".incorrect-sofar").text(incorrect);
    $(".skipped-sofar").text(skipped);
    myPublishChannel.publish('update', {
        'correct': correct
    })
}
broadcastChannel.subscribe('winner', (data) => {
    var dataObj = JSON.parse(JSON.stringify(data))
    var winnerID = dataObj.data.winnerID
    if (winnerID == myId) {
        $(".winner").text('YOU WON :D :D');
    } else if (winnerID == -1) {
        $(".winner").text('IT\'S A TIE!!');
    } else {
        $(".winner").text('YOU LOST :/');
    }
})


// Updates the question area
function updateQuestion() {
    if (index === 8) {
        endGame();
        return;
    }
};

function newQuestionSubscription(data) {
    console.log('new question callback called')
    var questionObj = JSON.parse(JSON.stringify(data))
    index = parseInt(questionObj.data.index)
    if (index === 8) {
        endGame();
        return;
    }
    $("#question-area").show();
    $("#timer-div").show();
    currentQuestion = questionObj.data.currentQuestion
    currentChoices[0] = questionObj.data.choice0
    currentChoices[1] = questionObj.data.choice1
    currentChoices[2] = questionObj.data.choice2
    currentChoices[3] = questionObj.data.choice3
    var questionNumber = index + 1;
    $("#index").text(questionNumber);
    $("#current-question").text(currentQuestion);

    $("#0").text(currentChoices[0]);
    $("#1").text(currentChoices[1]);
    $("#2").text(currentChoices[2]);
    $("#3").text(currentChoices[3]);

    console.log("Question #" + questionNumber + " " + currentQuestion);
}

broadcastChannel.subscribe('timeUpdate', (data) => {
    console.log('time update callback called')
    var timeObj = JSON.parse(JSON.stringify(data))
    time = timeObj.data.time
    $("#timer").html(time + " seconds");

    $(".choices").off("click").on("click", function () {
        choiceClicked = true;
        var userChoice = parseInt($(this).attr("id"));
        console.log("Clicked choice: " + userChoice);
        currentUserChoice = userChoice;
        $("#question-area").hide()
    });

    if (parseInt(timeObj.data.timeout)) {
        console.log('SERVER TIMER TIMED OUT')
        console.log('CHOSEN ANSWER IS ', currentUserChoice)
        if (currentUserChoice === -1 && !choiceClicked) {
            checkAnswer("timeout");
            //choiceClicked = false;
        } else {
            checkAnswer(currentUserChoice);
            currentUserChoice = -1
        }
    }

})



// Checks user input if right or wrong
function checkAnswer(answer) {
    $("#question-area").hide();
    console.log('Client\'s answer is being checked')
    var currentIndex;
    if (index == 8) {
        return;
    }
    currentAnswer = answer
}

broadcastChannel.subscribe('correctAnswer', (data) => {
    var correctAnswerObj = JSON.parse(JSON.stringify(data))
    console.log('SUBSCRIPTION CALLBACK FOR CORRECT ANSWER')
    currentIndex = parseInt(correctAnswerObj.data.index)
    correctChoice = correctAnswerObj.data.correctAnswerChoice
    correctChoiceIndex = parseInt(correctAnswerObj.data.correctChoiceIndex)


    if (index == currentIndex) {
        console.log('YOUr Answer to check is ' + currentAnswer)
        if (currentAnswer === correctChoiceIndex) {
            console.log("YOU Clicked the correct answer!");
            correct++;
            return;
        } else if (currentAnswer === -1) {
            console.log("YOU skipped the question");
            skipped++;
            return;
        } else {
            console.log("YOU Clicked the wrong answer...");
            incorrect++;
            return;
        }
        $("#timer-div").hide();
    }

})


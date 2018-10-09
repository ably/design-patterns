function getRandomArbitrary(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

var avatarsInAssets = [
    'https://cdn.glitch.com/0bff6817-d500-425d-953c-6424d752d171%2Favatar_8.png?1536042504672',
    'https://cdn.glitch.com/0bff6817-d500-425d-953c-6424d752d171%2Favatar_3.png?1536042507202',
    'https://cdn.glitch.com/0bff6817-d500-425d-953c-6424d752d171%2Favatar_6.png?1536042508902',
    'https://cdn.glitch.com/0bff6817-d500-425d-953c-6424d752d171%2Favatar_10.png?1536042509036',
    'https://cdn.glitch.com/0bff6817-d500-425d-953c-6424d752d171%2Favatar_7.png?1536042509659',
    'https://cdn.glitch.com/0bff6817-d500-425d-953c-6424d752d171%2Favatar_9.png?1536042513205',
    'https://cdn.glitch.com/0bff6817-d500-425d-953c-6424d752d171%2Favatar_2.png?1536042514285',
    'https://cdn.glitch.com/0bff6817-d500-425d-953c-6424d752d171%2Favatar_1.png?1536042516362',
    'https://cdn.glitch.com/0bff6817-d500-425d-953c-6424d752d171%2Favatar_4.png?1536042516573',
    'https://cdn.glitch.com/0bff6817-d500-425d-953c-6424d752d171%2Favatar_5.png?1536042517889'
]

var otherAvatar;
var my = {};
my.avatar = avatarsInAssets[getRandomArbitrary(0, 9)];
var you = {};
var myMsgArray = [];

//----------------------------AblyStuff
var myId = "id-" + Math.random().toString(36).substr(2, 16);
var apiKey = 'Aq4Xig.PPFgdg:2Q2Ekgj-a4nUGkxm';
var ably = new Ably.Realtime({
    key: apiKey,
    clientId: myId,
    echoMessages: false
});
var chatChannel = ably.channels.get("chat");
var readReceiptsChannel = ably.channels.get("read-receipts");
var presenceChannel = ably.channels.get("presence");
//----------------------------


chatChannel.subscribe("userAvatar", (data) => {
    var dataObj = JSON.parse(JSON.stringify(data));
    if (dataObj.clientId != myId) {
        otherAvatar = dataObj.data.avatar;
        you.avatar = otherAvatar;
    }
});

presenceChannel.presence.subscribe('enter', function (member) {
    if (member.clientId != myId) {
        chatChannel.publish("userAvatar", {
            "avatar": my.avatar
        });
    }
});
presenceChannel.presence.enter();
presenceChannel.presence.get(function (err, members) {
    for (var i in members) {
        if (members[i].clientId != myId) {
            chatChannel.publish("userAvatar", {
                "avatar": my.avatar
            });
        }
    }
});

function formatAMPM(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
}

function insertChat(who, text, currentMsgId) {
    var messageBoxHTML = "";
    var date = formatAMPM(new Date());
    var seenStatus = false;
    if (who == "me") {
        messageBoxHTML = '<li class="self">' +
            '<div style="color: #e0e0de" class="avatar">' +
            '<img src="' + my.avatar + '" />' +
            '/</div>' +
            '<div class="messages">' +
            '<p>' + text + '</p>' +
            '<div><time datetime="2009-11-13T20:00">' + date + '<div style="text-align:right;" id="' + currentMsgId + '"> sent </div>' + '</time>' +
            '</div>' +
            '</li>';
        var myMsgStatus = {};
        myMsgStatus["msgId"] = currentMsgId;
        myMsgStatus["seen"] = false;
        myMsgStatus["delivered"] = false;
        myMsgArray.push(myMsgStatus);
    } else {
        messageBoxHTML = '<li class="other">' +
            '<div style="color: #e0e0de" class="avatar">' +
            '<img src="' + you.avatar + '" />' +
            '/</div>' +
            '<div class="messages">' +
            '<p>' + text + '</p>' +
            '<div><time datetime="2009-11-13T20:00">' + date + '</time>' +
            '</div>' +
            '</li>';
        if (document.hasFocus()) {
            seenStatus = true;
        }
        readReceiptsChannel.publish("receipt", {
            "delivered": true,
            "msgId": currentMsgId,
            "seen": seenStatus,
            "alreadyActive": true
        });
    }

    $("ul").append(messageBoxHTML).scrollTop($("ul").prop('scrollHeight'));

}

window.onfocus = function () {
    readReceiptsChannel.publish("receipt", {
        "alreadyActive": false,
        "seen": true,
        "delivered": true,
    })
};

function resetChat() {
    $("ul").empty();
}

window.onload = inputKeyUpEvent;

function inputKeyUpEvent() {
    var input = document.getElementById("myMsg");
    input.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            document.getElementById("sendMessage").click();
        }
    });
}


function sendMyMessage() {
    var newMsgId = "msg-id-" + Math.random().toString(36).substr(2, 6);
    var text = document.getElementById("myMsg").value;
    document.getElementById("myMsg").value = "";
    if (text !== "") {
        insertChat("me", text, newMsgId);
        chatChannel.publish("chatMessage", {
            message: text,
            localMsgId: newMsgId
        });
        $(this).val('');
    }
}

readReceiptsChannel.subscribe("receipt", (data) => {
    var dataObj = JSON.parse(JSON.stringify(data));
    var receiptMsgId = dataObj.data.msgId;
    if (dataObj.data.seen && dataObj.data.alreadyActive) {
        myMsgArray.forEach((arrData, index)=>{
            if (arrData.msgId == receiptMsgId) {
                if (document.getElementById(receiptMsgId)) {
                    (document.getElementById(receiptMsgId)).innerHTML = 'seen';
                }
            }
            myMsgArray.splice(index,1)
        })
        for (var i = 0; i < myMsgArray.length; i++) {
            if (myMsgArray.msgId == receiptMsgId) {
                if (document.getElementById(receiptMsgId)) {
                    (document.getElementById(receiptMsgId)).innerHTML = 'seen';
                }
            }
        }
    } else if (dataObj.data.seen && !dataObj.data.alreadyActive) {
        while(myMsgArray.length){
            myMsgArray.forEach((arrData, index)=> {
                if(!arrData.seen){
                    if (document.getElementById(arrData.msgId)) {
                        (document.getElementById(arrData.msgId)).innerHTML = 'seen';
                    }
                    myMsgArray.splice(index,1)
                }
            })
        }
    } else if (dataObj.data.delivered) {
        if (document.getElementById(receiptMsgId)) {
            (document.getElementById(receiptMsgId)).innerHTML = 'delivered';
        }
    }
})

//-- Clear Chat
resetChat();

//-- Print Messages
chatChannel.subscribe("chatMessage", (data) => {
    var dataObj = JSON.parse(JSON.stringify(data));
    var message = dataObj.data.message;
    var receivedMsgId = dataObj.data.localMsgId;
    insertChat("you", message, receivedMsgId);
    if (document.hasFocus()) {
        readReceiptsChannel.publish("receipt", {
            "delivered": true,
            "msgId": receivedMsgId,
            "seen": true,
            "alreadyActive": true
        });
    } else {
        readReceiptsChannel.publish("receipt", {
            "delivered": true,
            "msgId": receivedMsgId,
            "seen": false,
            "alreadyActive": false
        });
    }
})
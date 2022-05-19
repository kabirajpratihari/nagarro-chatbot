'use strict';

const { dialogflow, BasicCard, Button, Image, Suggestions, Conversation, Permission, SimpleResponse } = require("actions-on-google");
const { Card, Suggestion } = require('dialogflow-fulfillment');
const app = dialogflow();
let originlist = ["Delhi", "Mumbai", "Chennai"];
let destlist = ["Delhi", "Mumbai", "Bengaluru", "Chennai", "Gurugram"];
let hotellist = ["Radisson","Le Meridian","Palm Springs","Westin","Oaktree"]

// For Debug - Start
// const express = require('express')
// const bodyParser = require('body-parser');
// const port = process.env.PORT || 3000;
// For Debug - End

// //For Deployment - Start
const functions = require('firebase-functions');
// For Deployment - End

function isEmpty(val){
   return (val === undefined || val == null || val.length <= 0) ? true : false;
}

app.intent("Default Welcome Intent", conv => {
    conv.data.requestedPermission = "DEVICE_PRECISE_LOCATION";
    return conv.add(
      new Permission({
        context: "to locate you",
        permissions: conv.data.requestedPermission
      })
    );
});

app.intent("get_location", (conv, params, permissionGranted) => {
   if (permissionGranted) {
      const { requestedPermission } = conv.data;
      if (requestedPermission === "DEVICE_PRECISE_LOCATION") {
        conv.add(`You are currently at `+conv.device.location.formattedAddress);
        conv.contexts.set("getcurrentlocation",20,{location: conv.device.location.city})
        conv.add(`Hi! I am your travel planner. You can ask me to book your train ticket/s or hotel room. What would you like to do?\n\n\nBook a train ticket\nBook a room`);
       }
    } else {
      conv.add("Sorry, permission denied. I cannot show your location in suggestions");
      conv.contexts.set("getcurrentlocation",20,{location: null})
      conv.add(`Hi! I am your travel planner. You can ask me to book your train ticket/s or hotel room. What would you like to do?\n\n\nBook a train ticket\nBook a room`);
    }
 });

app.intent("Default Fallback Intent", conv => {
   conv.add(`Oops! Looks like you have provided a wrong input. Please start over. What would you like to do?\n\n\nBook a train ticket\nBook a room`);
});

app.intent("seat.fallback", conv => {
   conv.followup("booktrainseat");
});

app.intent("hotellist.fallback", conv => {
   conv.followup("bookhotelconfirm");
});

app.intent("book.start", conv => {
   if (!(isEmpty(conv.parameters.bookstart))) {
      let originvar="";
      if (!!conv.contexts.get("getcurrentlocation").parameters.location)
      {
         let currentloc = conv.contexts.get("getcurrentlocation").parameters.location;
         if (!(originlist.includes(currentloc)))
         {
            originlist.push(currentloc);
         }
      }
      for (let i=0; i<originlist.length; i++)
      {
         originvar=originvar+originlist[i]+"\n";
      }
      if (conv.parameters.bookstart.includes("train") || conv.parameters.bookstart.includes("TRAIN") || conv.parameters.bookstart.includes("Train"))
      {
         conv.add(`What's the origin of train?\n\nSuggestions:\n`+originvar);
      }
      else
      {
         conv.contexts.set("waitingdesthotel",20,{});
         conv.add(`Please provide destination for booking room\n\nSuggestions: `+originvar);
      }
   } 
});

app.intent("book.train.origin", conv => {
   if (!(isEmpty(conv.parameters.origin))) {
      for (let i=0; i<destlist.length; i++)
      {
         if (conv.parameters.origin == destlist[i])
         {
            destlist.splice(i, 1);
            break;
         }
      }
      let destvar="";
      for (let i=0; i<destlist.length; i++)
      {
         destvar=destvar+destlist[i]+"\n";
      }
      conv.add(`What's the destination of train?\n\nSuggestions:\n`+destvar);
   } 
});

app.intent("book.train.destination", conv => {
   if (!(isEmpty(conv.parameters.destination))) {
      if (conv.contexts.get("waitingfordestination").parameters.origin == conv.parameters.destination)
      {
         let orgvarcon = conv.contexts.get("waitingfordestination").parameters.origin
         conv.contexts.set("waitingfordestination",20,{ origin: orgvarcon });
         conv.followup("booktraindestination");
      }
      conv.add(`When do you want to book the train tickets?\n\nSuggestions : Today\nTomorrow\n3 days after today\nEnter date`);
   } 
});

app.intent("book.train.date", conv => {
   if (!(isEmpty(conv.parameters.date))) {
      let datevar = new Date(conv.parameters.date);
      const today = new Date();
      let tomorrow =  new Date();
      let yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      tomorrow.setDate(today.getDate() + 1);
      if (datevar.toDateString() == tomorrow.toDateString())
      {
         conv.followup("booktraindateavailability");
      }
      else if (datevar <= yesterday)
      {
         conv.add(`Sorry! date cannot be earlier than today. Please enter new date`);
      }
      else
      {
         conv.followup("booktrainclass");
      }  
   } 
});

app.intent("book.train.dateavailability", conv => {
   if (!(isEmpty(conv.parameters.dateavailability))) {
      if (["Change date","change Date","Change Date","CHANGE DATE","change date"].includes(conv.parameters.dateavailability))
      {
         conv.followup("booktraindate");
      }
      else if (["Change destination","Change Destination","change Destination","CHANGE DESTINATION","change destination"].includes(conv.parameters.dateavailability))
      {
         let originvarcontext = conv.contexts.get("waitingfordestination").parameters.origin;
         conv.contexts.set("waitingfordestination",20,{ origin: originvarcontext });
         conv.followup("booktraindestination");
      }
      else
      {
         conv.add(`Lets start again. What would you like to do?\n\n\nBook a train ticket\nBook a room`);
      }
   } 
});

app.intent("book.train.class", conv => {
   if (!(isEmpty(conv.parameters.classinput))) {
      if (["EC","1AC","2AC","3AC","ec","1ac","2ac","3ac"].includes(conv.parameters.classinput))
      {
         conv.contexts.set("seatfallbackcontext",20,{});
         conv.add(`Alright! Please select your seats from `+conv.contexts.get("waitingfordestination").parameters.origin+` to `+conv.contexts.get("waitingfordestination").parameters.destination+` for `+conv.parameters.classinput+` class\n\nA|1 2 3 4 5 6\nB|1 2 3 4 5 6\nC|1 2 3 4 5 6`);
      }
      else if (["Change destination","Change Destination","change Destination","CHANGE DESTINATION","change destination"].includes(conv.parameters.classinput))
      {
         let originvarcontext1 = conv.contexts.get("waitingfordestination").parameters.origin;
         conv.contexts.set("waitingfordestination",20,{ origin: originvarcontext1 });
         conv.followup("booktraindestination");
      }
      else
      {
         conv.add(`Lets start again. What would you like to do?\n\n\nBook a train ticket\nBook a room`);
      }
   } 
});

app.intent("book.train.seat", conv => {
   if (!(isEmpty(conv.parameters.seatvalue))) {
      if (!(/^([a-cA-C]{1}[1-6]{1})$/.test(conv.parameters.seatvalue)))
      {
         conv.followup("booktrainseat");
      }
      conv.followup("booktrainpaymentprocess");
   } 
});

app.intent("book.train.paymentprocess", conv => {
   conv.add(`Please complete the payment process by clicking here.\n\n\nQuick Suggestions:\n\nPayment completed`);
   conv.add(`Thank you for your payment. Your tickets have been booked and your booking ID is `+Math.random().toString(36).slice(2)+`\n\nDo you want to book hotel room also?\n\nYes\nNo`);
});

app.intent("book.train.paymentcomplete", conv => {
   if (!(isEmpty(conv.parameters.bookhotel))) {

      let destvar = conv.contexts.get("waitingfordestination").parameters.destination;
      let datevar = conv.contexts.get("datecontext").parameters.date
      if (["Yes","yes","YES"].includes(conv.parameters.bookhotel))
      {
         conv.contexts.set("infoforroombook",20,{ destination: destvar, date: datevar})
         conv.followup("bookhotelconfirm");
      }
      else
      {
         conv.close(`Have a great journey`);
      }
   } 
});

app.intent("book.hotel.destination", conv => {
   if (!(isEmpty(conv.parameters.destination))) {
      conv.add(`When do you want to book the room?\n\nSuggestions : Today\nTomorrow`);
   } 
});

app.intent("book.hotel.date", conv => {
   if (!(isEmpty(conv.parameters.date))) {
      let hotelvar="";
      for (let i=0; i<hotellist.length; i++)
      {
         hotelvar=hotelvar+hotellist[i]+"\n";
      }
     let destvarroom = conv.contexts.get("waitingdesthotel").parameters.destination;
     let datevarroom = conv.contexts.get("waitingdesthotel").parameters.date;
     conv.contexts.set("infoforroombook",5,{ destination: destvarroom, date: datevarroom})
     conv.add(`Please select from below available hotels.\n\nSuggestions:\n`+hotelvar) 
   } 
});

app.intent("book.hotel.confirm", conv => {
   if (!(isEmpty(conv.parameters.hotel))) {
     if (!(["RADISSON","LE MERIDIAN","WESTIN","PALM SPRINGS","OAKTREE"].includes(conv.parameters.hotel.toUpperCase())))
     {
        conv.followup("bookhotelconfirm");
     }
     conv.close(`Your hotel `+conv.parameters.hotel+` have been booked for `+conv.contexts.get("infoforroombook").parameters.destination+` on `+conv.contexts.get("infoforroombook").parameters.date.toString());
   } 
});



// For Debug - Start
// const expressApp = express().use(bodyParser.json());
// expressApp.post('/dialogflowFirebaseFulfillment',app);
// expressApp.listen(port);
// // For Debug - End

// For Deployment - Start
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
//exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app)
//For Deployment - End




// // See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// // for Dialogflow fulfillment library docs, samples, and to report issues
// 'use strict';
 
// const functions = require('firebase-functions');
// const {WebhookClient} = require('dialogflow-fulfillment');
// const {Card, Suggestion} = require('dialogflow-fulfillment');
 
// process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
// exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
//   const agent = new WebhookClient({ request, response });
//   console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
//   console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
//   function welcome(agent) {
//     agent.add(`Welcome to my agent from VS code!`);
//   }
 
//   function fallback(agent) {
//     agent.add(`I didn't understand`);
//     agent.add(`I'm sorry, can you try again?`);
//   }
  
//   function demofulfillment(agent) {
//     agent.add(`hi from fulfillment from VS code` + agent.parameters.testvar.name);
//   }

//   // // Uncomment and edit to make your own intent handler
//   // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
//   // // below to get this function to be run when a Dialogflow intent is matched
//   // function yourFunctionHandler(agent) {
//   //   agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
//   //   agent.add(new Card({
//   //       title: `Title: this is a card title`,
//   //       imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
//   //       text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
//   //       buttonText: 'This is a button',
//   //       buttonUrl: 'https://assistant.google.com/'
//   //     })
//   //   );
//   //   agent.add(new Suggestion(`Quick Reply`));
//   //   agent.add(new Suggestion(`Suggestion`));
//   //   agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
//   // }

//   // // Uncomment and edit to make your own Google Assistant intent handler
//   // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
//   // // below to get this function to be run when a Dialogflow intent is matched
//   // function googleAssistantHandler(agent) {
//   //   let conv = agent.conv(); // Get Actions on Google library conv instance
//   //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
//   //   agent.add(conv); // Add Actions on Google library responses to your agent's response
//   // }
//   // // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
//   // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

//   // Run the proper function handler based on the matched Dialogflow intent name
//   let intentMap = new Map();
//   intentMap.set('Default Welcome Intent', welcome);
//   intentMap.set('Default Fallback Intent', fallback);
//   intentMap.set('demofulfilllment', demofulfillment);
//   // intentMap.set('your intent name here', yourFunctionHandler);
//   // intentMap.set('your intent name here', googleAssistantHandler);
//   agent.handleRequest(intentMap);
// });


// //const functions = require("firebase-functions");

// // // Create and Deploy Your First Cloud Functions
// // // https://firebase.google.com/docs/functions/write-firebase-functions
// //
// // exports.helloWorld = functions.https.onRequest((request, response) => {
// //   functions.logger.info("Hello logs!", {structuredData: true});
// //   response.send("Hello from Firebase!");
// // });

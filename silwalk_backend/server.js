require('dotenv').config()
require('aws-sdk/lib/maintenance_mode_message').suppress = true;
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); 
const admin = require('./firebase_admin')
const  axios  = require('axios');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

const app = express();
const db = admin.database()
const database= admin.firestore()

const host_server='13.235.82.105'

const s3 = new AWS.S3()


// Set your AWS access key, secret key, and region here
const awsAccessKeyId = 'AKIAXYN4QWK6AA5WYEIT';
const awsSecretAccessKey = 'Zxml21EzGzth/vlyyyfwJk0YLaP6JGU08O+rpL+p';
const awsRegion = 'ap-south-1'; // Replace with your desired AWS region


const port = process.env.PORT || 3000;
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use(cors())


//zoom meeting api key 
const apiKey='Yz7SBHYvSr6GsJLgDD5lOw'
const apiSecret='ehW81vvOJQ6KcX7nQiRLvta0qGHYPgbu'

const clientId = 'Yz7SBHYvSr6GsJLgDD5lOw';
const clientSecret = 'ehW81vvOJQ6KcX7nQiRLvta0qGHYPgbu';
const redirectUri = 'http://localhost:3001/auth/callback/'; 


// Set AWS credentials
AWS.config.update({
  accessKeyId: awsAccessKeyId,
  secretAccessKey: awsSecretAccessKey,
  region: awsRegion,
});

const upload = multer({
  storage: multerS3({
    s3: new AWS.S3(),
    bucket: 'audio-test77',
    acl: 'public-read', // Make the uploaded video public
    key: function (req, file, cb) {
      cb(null, 'videos/' + Date.now() + '-' + file.originalname);
    },
  }),
});
// File Upload Route
app.post("/upload", upload.array('file'), (req, res) => {
  res.json({ message: "File uploaded successfully", url: req.file.location });
});



// Store the access token in memory (in a production environment, use a database)
let accessToken = null;

// Handle OAuth 2.0 authorization with Zoom
app.get('/zoomAuth/authorize', (req, res) => {
  // Redirect the user to Zoom's authorization page
  const zoomAuthUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.redirect(zoomAuthUrl);
});

// Callback endpoint to handle Zoom's response
app.post('/auth/callback', async (req, res) => {
  const { code, Meeting_title,Meeting_dis,Meeting_duration,selectedDate,uid } = req.body;
  
  console.log(code)
  // Exchange the authorization code for an access token
  try {
    const tokenUrl = 'https://zoom.us/oauth/token';
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await axios.post(tokenUrl, null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      },
      auth: {
        username: apiKey,
        password: apiSecret,
      },
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    accessToken = response.data.access_token;
    console.log(accessToken)

    // Use the accessToken to create a Zoom meeting
    const apiUrl = 'https://api.zoom.us/v2/users/me/meetings';
    const meetingDetails = {
      topic: Meeting_title,
      type: 2, // 2 for scheduled meeting, 1 for instant meeting
      start_time: selectedDate,
      duration: Meeting_duration,
      timezone: 'UTC',
      default_password: true,
    };

    const meetingResponse = await axios.post(apiUrl, meetingDetails, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    console.log(meetingResponse)
    // Send meeting details to the frontend as a JSON response
    const { id, password } = meetingResponse.data;
    
    
    //data upload of meeting in firestore 
    const collectionRef = database.collection('meetings').doc(`${uid}`).collection('created_meetings')
    const docRef = collectionRef.doc(`${id}`)
    const data = {
      meetingId:id,
      meetingPassword:password,
      start_time:selectedDate,
      created_by:uid,
      duration:Meeting_duration,
      meetingTitle:Meeting_title,
      meetingDiscription:Meeting_dis,
      
    }
    await docRef.set(data).then((e)=>{
      console.log("Data uploaded to firebase ")
    }).catch((e)=>{
      console.log(e)
    })
    res.json({ meetingId: id, meetingPassword: password });



  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error handling Zoom authentication');
  }
});



app.post('/handle-request', async (req, res) => {
    try {
        const { prompt,meeting } = req.body;
        console.log(meeting)
        const late_hour= meeting.Late_time.hour
        const late_minutes = meeting.Late_time.minutes
        const late_time = (late_hour*60) + late_minutes
        console.log(late_time)

        let botResponse = '';

        if (prompt.toLowerCase().includes('summary')) {
            const summaryRef = db.ref(`/${meeting.meetingNumber}/summary`);
            const snapshot = await summaryRef.once('value');
            const summaryData = snapshot.val();

            botResponse = summaryData
                ?  JSON.stringify(summaryData)
                : 'Wait for sometime. No summary data found.';
        } 
        else if (prompt.toLowerCase().includes('transcription')) {
            const transcriptionRef = db.ref(`/${meeting.meetingNumber}/transcription`);
            const snapshot = await transcriptionRef.once('value');
            const transcriptionData = snapshot.val();

            botResponse = transcriptionData
                ? JSON.stringify(transcriptionData)
                : 'Wait for sometime. No transcription data found.';
        } 
        
        else {
         
            botResponse = 'Bot response for other prompts';
        }

        res.json({ botResponse });
    } catch (error) {
        console.error('Error handling request:', error);
        res.status(500).json({ error: 'Error handling request' });
    }
});
app.post('/set_hls-meeting',async (req,res)=>{
  const {link,meeting_id}= req.body;
  console.log(link,meeting_id)
  const params = {
    link: link,
    meeting_id: meeting_id,
  };
  axios.get('http://3.108.215.1:8000/get_summary',{params}).then((E)=>{
    console.log("Meeitng HLS link is set")
    console.log(E)
  }).catch((E)=>{
    console.log(E)
  })
})

app.post('/breakout-summary',async (req,res)=>{
  const {link,title,meeting_id}=req.body;
  console.log(link,meeting_id,title)
  const params = {
    link,
    meeting_id,
    title,
  }
  await axios.get('http://3.108.215.1:8000/analyse_discussion',{params}).then((E)=>{
    console.log("Meeitng HLS link is set")
    console.log(E)
  }).catch((E)=>{
    console.log(E)
  })
})


app.post('/Custom_analysis',async (req,res)=>{
  const { meeting_id,title,user_profile,intent,purpose,format_options}=req.body;
  console.log(meeting_id,title,user_profile,intent,purpose,format_options)
  const params = {
    meeting_id,
    title,
    user_profile,
    intent,
    purpose,
    format_options
  }

  await axios.post('http://3.108.215.1:8000/user_defined_analysis',params).then((E)=>{
    console.log("Meeitng HLS link is set")
    console.log(E.data)
    res.json({data:E.data})
  }).catch((E)=>{
    console.log(E)
  })


})

app.post('/ask_question',async(req,res)=>{
  const {meeting_id,question}=req.body
  console.log(meeting_id,question)
  const params = {
      meeting_id:'11011011',
      question:question,
  }
  await axios.get('http://3.108.215.1:8000/classroom_question',{params}).then((e)=>{
                    const answer =e.data
                    res.json({answer})
                })
})

app.post('/Top_insight',async(req,res)=>{
  const {meeting_id}=req.body
  console.log(meeting_id)
  const params = {
    meeting_id:meeting_id
  }
  await axios.get('http://3.108.215.1:8000/top_breakout_insights',{params}).then((e)=>{
                    console.log(e)
                    const answer =e.data
                    res.json({result:answer})
                })
  
})




app.post('/breakout-upload',async(req,res)=>{
  const {video} = req.body

  try {


  }catch(error){
    console.log('Error in uploading in breakout room recording')
    res.status(500).json({error:'Error handling request'})
  }
})



app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

const{S3Client,GetObjectCommand}=require("@aws-sdk/client-s3");
const {getSignedUrl}=require("@aws-sdk/s3-request-presigner");

const s3Client=new S3Client({
    region:"ap-south-1",
    credentials:{
        accessKeyId:"AKIAXYN4QWK6E474E2FX",
        secretAccessKey:"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"
    },
});

async function getObjectURL(key){
    const command=new GetObjectCommand({
        Bucket:'audio-test77',
        Key:key,
    });
    const url=await getSignedUrl(s3Client,command);
    return url;
}

async function API_Url_Call(){
    console.log("URL",await getObjectURL("transcript.json"));
}

API_Url_Call();
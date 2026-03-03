const CLIENT_ID = `fb9e87d2-56a1-4c2c-b17f-4efb8fd3757e`;
const CLIENT_SECRET = `29d58986-d92e-402f-b6e6-7c4ffcdd774d`

function readData() {
   const PERSONAL_ACCESS_TOKEN = "2ff06667-c44f-455f-a592-bf19c7df082a";
   const API_URL = "https://api.adp.com/hr/v2";
   const DATA_ENDPOINT = "/workers?$top=5";
   const response = UrlFetchApp.fetch(API_URL + DATA_ENDPOINT, {
       headers: {
           "Authorization": "Bearer " + PERSONAL_ACCESS_TOKEN
       },
       options: {
         "muteHTTPExceptions": true
       }
   });
   const content = JSON.parse(response.getContentText());
   console.log(content);
}

function tokenRequest() {
  var headers = {
    "Authorization" : "Basic " + Utilities.base64Encode(CLIENT_ID + ':' + CLIENT_SECRET)
  };

  var params = {
    "method":"POST",
    "headers":headers
  };
  const API_URL = `https://accounts.adp.com/auth/oauth/v2/token?grant_type=client_credentials`;
  const response = UrlFetchApp.fetch(API_URL, params);
  const content = JSON.parse(response.getContentText());
  console.log(content);
}
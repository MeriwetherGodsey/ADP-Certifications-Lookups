const CLIENT_ID = PropertiesService.getScriptProperties().getProperty('ADP_CLIENT_ID');
const CLIENT_SECRET = PropertiesService.getScriptProperties().getProperty('ADP_CLIENT_SECRET');

function readData() {
   const PERSONAL_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty('ADP_ACCESS_TOKEN');
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
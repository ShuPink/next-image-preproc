/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const B2 = require('backblaze-b2');

/**
 * Loads json data from a local file
 * @param {String} file - file location
 * @return {object} json
 */
function jsonFromFile(file) {
  const content = fs.readFileSync(file);
  const json = JSON.parse(content);
  return json;
}

// Use the processed images, not raws
const SOURCE_DIR = './_dev/procs';

/**
 * Directory contents
 * @typedef {Object} files
 * @property {string} file - filename including extension
 * @property {number} width - image width.
 * @property {number} height - image height.
 */

/**
 * Directory info
 * @typedef {Object} listing
 * @property {string} folder - subfolder name
 * @property {Array.<files>} files - file info
 */

// get data for all directories from json file output from preprocessImages.js (npm proc)
const listingJson = jsonFromFile('./_dev/listing.json');

const b2 = new B2({
  applicationKeyId: process.env.ACCOUNT_ID, // or accountId: 'accountId'
  applicationKey: process.env.APPLICATION_KEY, // or masterApplicationKey
});

/**
 * Have to get upload url before running upload operation
 * https://www.backblaze.com/b2/docs/b2_get_upload_url.html
 */
async function getUploadUrl() {
  try {
    // must authorize first
    await b2.authorize();

    // get the upload url
    const { data } = await b2.getUploadUrl({
      bucketId: process.env.BUCKET_ID,
    });
    const { uploadUrl, authorizationToken } = data;
    return { uploadUrl, authorizationToken };
  } catch (err) {
    console.log('Error getting upload Url:', err);
    return false;
  }
}

/**
 * upload file to B2
 * https://www.backblaze.com/b2/docs/b2_upload_file.html
 * @param {string} url - the upload url retrieved from the getUploadUrl function
 * @param {string} token - the auth token retrieved from the getUploadUrl function
 * @param {string} foldername - name of the subfolder
 * @param {string} file - name of the file (including extension)
 */
async function uploadFile(url, token, foldername, file) {
  try {
    const filename = file.file;

    // optional info headers, throws error if more than 10 keys set
    // valid characters should be a-z, A-Z and '-',
    // all other characters will cause an error to be thrown
    const info = {
      width: file.width,
      height: file.height,
    };

    // upload the file
    return b2.uploadFile({
      uploadUrl: url,
      uploadAuthToken: token,
      fileName: `${foldername}/${filename}`,
      mime: 'image/jpeg',
      data: fs.readFileSync(`${SOURCE_DIR}/${foldername}/${filename}`),
      info,
      onUploadProgress: (event) => { console.log(event); },
    }); // returns a promise
  } catch (err) {
    console.log('Error uploading file:', err, file);
    return false;
  }
}

/**
 * Upload all folders - note that with B2:
 *  - uploads are Class A (free) transactions
 *  - auth is a Class C transaction (2500 a day)
 * @param {Array.<listing>} listing - listing data from the image preprocessor
 * json containing listing of directory (use jsonFromFile function)
 * @param {string} uploadUrl - the upload url retrieved from the getUploadUrl function
 * @param {string} authorizationToken - the auth token retrieved from the getUploadUrl function
 */
async function uploadFiles(listing, uploadUrl, authorizationToken) {
  try {
    /* upload the files
      we want this to be sync not async, if you try to send multiple files at once
      B2 will send through an error. To upload more at a time,
      retrieve multiple upload urls to run multiple threads
    */

    // eslint-disable-next-line no-restricted-syntax
    for (const list of listing) {
      const { folder: foldername, files } = list;
      // eslint-disable-next-line no-restricted-syntax
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop
        await uploadFile(uploadUrl, authorizationToken, foldername, file);
      }
    }
  } catch (err) {
    console.log('Error uploading bulk:', err);
  }
}

// processing starts here
(async () => {
  // get the required url and token
  const { uploadUrl, authorizationToken } = await getUploadUrl();
  // bulk (series) upload
  await uploadFiles(listingJson, uploadUrl, authorizationToken);
})();

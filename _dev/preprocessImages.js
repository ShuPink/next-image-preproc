/* eslint-disable no-console */
/** note this is only to be run in dev
 * because we're not using cloudinary or strapi
 * need to extract the list of images and their dimensions
 */
const sharp = require('sharp');
const fs = require('fs');

const MODE = 2; // 0: create listing; 1: transform images; 2: both
const SOURCE_DIR = './_dev/raws'; // make sure any images are in a subfolder
const DEST_DIR = './_dev/procs'; // this must already exist
const HEIGHT = 1440;
const WIDTH = 3440;
// const QUALITY = 85;

/**
 * Read contents of a directory
 * @param {String} path - file location
 * @return {object} file
 */
function readdirAsync(path) {
  return new Promise((resolve, reject) => {
    fs.readdir(path, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Remove directory and it's contents
 * https://coderrocketfuel.com/article/remove-directory-files-and-sub-directories-in-node-js
 * @param {String} path - path of directory to remove
 */
const removeDir = (path) => {
  console.log(path, fs.existsSync(path));
  if (fs.existsSync(path)) {
    const files = fs.readdirSync(path);
    console.log(files);
    if (files.length > 0) {
      files.forEach((filename) => {
        if (fs.statSync(`${path}/${filename}`).isDirectory()) {
          removeDir(`${path}/${filename}`);
        } else {
          fs.unlinkSync(`${path}/${filename}`);
        }
      });
    } else {
      console.log('No files found in the directory.');
    }
  } else {
    console.log('Directory path not found.');
  }
};

/**
 * Write object to json
 * @param {object} input
 * @param {String} path - file location
 * @param {String} filename - filename
 */
function writefile(input, dir, filename) {
  const json = JSON.stringify(input);
  fs.writeFileSync(`${dir}/${filename}.json`, json, 'utf-8');
}

/**
 * extract meta data from files in a folder
 * @param {string} folder - path (not including the source dir)
 */
async function processFiles(folder) {
  const path = `${SOURCE_DIR}/${folder}`;
  const files = await readdirAsync(`${path}`);

  // process file
  const promises = await files.map(async (file) => {
    const imgPath = `${path}/${file}`;
    const img = sharp(imgPath).clone();

    const filePath = `${DEST_DIR}/${folder}/${file}`;

    const data = await img
      .metadata()
      .then(async (metadata) => {
        const { width, height } = metadata;

        // ---- Do any image processing here ---
        // use below options if doing object-fit / cover
        // const isPortrait = width < height;
        // const options = isPortrait ? { height: HEIGHT } : { width: WIDTH };

        // by default resize images to height specified
        let options = { height: HEIGHT };
        let ratio = HEIGHT / height;

        // unless image is in the about folder, then resize by width
        if (folder === '000_About') {
          options = { width: WIDTH };
          ratio = WIDTH / width;
        }

        if (MODE >= 1) {
          img.resize(options).toFile(filePath);
        }

        const newHeight = Math.round(height * ratio);
        const newWidth = Math.round(width * ratio);

        // -- Specify any metadata to return here ---
        return { file, width: newWidth, height: newHeight };
      })
      .catch((err) => console.log('uh oh', err));

    return data;
  });

  const fileInfo = await Promise.all(promises).catch((err) => {
    console.error('Error processing files', err);
  });

  return fileInfo;
}

// code runs here
(async () => {
  // get the gallery folders
  const folders = await readdirAsync(SOURCE_DIR);

  if (MODE >= 1) {
    // delete existing subfolders and files
    const dFolders = await readdirAsync(DEST_DIR);
    dFolders.forEach((df) => {
      removeDir(`${DEST_DIR}/${df}`);
      fs.rmdirSync(`${DEST_DIR}/${df}`);
    });

    // make the public subfolders - otherwise sharp won't write to the directories
    folders.forEach((f) => {
      fs.mkdirSync(`${DEST_DIR}/${f}`);
    });
  }

  const infoPromises = await folders.map((f) => processFiles(f));
  const info = await Promise.all(infoPromises).catch((err) => {
    console.error('Error processing files', err);
  });

  const final = folders.map((folder, index) => ({ folder, files: info[index] }));

  if (MODE === 0 || MODE === 2) {
    writefile(final, './_dev', 'listing');
  }
})();

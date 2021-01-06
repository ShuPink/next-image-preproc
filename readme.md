This is an image preprocessing module for a [Next.js](https://nextjs.org/) project.

It was created to work with the [`next/image`](https://nextjs.org/docs/api-reference/next/image) component, where image dimensions were needed, and original image sizes were way bigger than needed (like double the size), and I really just wanted to save some bandwidth. 

The project uses:
- [sharp](https://www.npmjs.com/package/sharp) for image processing
- [backblaze-b2](https://www.npmjs.com/package/backblaze-b2) for cloud storage

The image preprocessor resizes images and  extracts metadata into a json file.


## Getting Started

Put any image files to be converted into the `_dev/raws` folder.  Make sure any images are contained in a subfolder. i.e.

- _dev
	- raws
		- folder1
			- image1.jpg
			- image2.jpg
		- folder2
			- image3.jpg

Nested subfolders haven't been accounted for.

By default the processed images will be put in the `procs` folder. 
The metadata is written to `_dev/listing.json`.

```bash
# compress images & get directory listing
npm run proc

# upload to B2
npm run up
```

If needed you can modify  `preprocessImages.js` to: 
- change the source (`SOURCE_DIR`)  and destination (`DEST_DIR`) directories
- change the resized dimensions - default at (`WIDTH`) 3440 x (`HEIGHT`) 1440 px
- change image processing steps e.g. quality or resizing logic.  Default is resize proportionally to the height constraint.
	-  just add your code below the `---- do any image processing here ----` comment
- return additional metadata 
	-  just add properties to the code below the `-- specify any metadata to return here ---` comment


## Image Processing

The existing code only uses Sharp to get the dimensions of the image (for `next/image`) and to resize images.  However, as mentioned above you can really do any kind of image processing you want within the capabilities of [the Sharp API](https://sharp.pixelplumbing.com/api-constructor).
  

## Cloud Storage

This module uses Backblaze B2 as cloud storage. 

To sign up follow [B2's documentation](https://www.backblaze.com/b2/docs/quick_account.html).

It really just uploads your files to backblaze using [their API's](https://www.backblaze.com/b2/docs/calling.html).  Make sure you set permissions on your app key to have write privileges. 

### Environmental Variables
Use the `.env.example` template to create a `.env` file containing your B2 account ID, application key and bucket ID which all should be available from your backblaze account when you sign up.

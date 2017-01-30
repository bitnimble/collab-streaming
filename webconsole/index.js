let express = require('express');
let bodyParser = require('body-parser');
let fs = require('fs');
let _path = require('path');
let child_process = require('child_process');
let app = express();

let rtmpServer = "rtmp://192.168.131.132/stream/index";

app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

app.use(express.static('public'));

let currentPlaying;
let queue = [];

let ffmpeg;

function skip() {
	if (ffmpeg)
		ffmpeg.kill();
}

function playNext() {
	if (queue.length == 0) {
		currentPlaying = undefined;
		return;
	}

    currentPlaying = queue.splice(0, 1)[0];
    let hell = currentPlaying.slice(0);
    hell = hell.split("\\").join("\\\\\\\\");
    hell = hell.split(":").join("\\\\\\:");
    hell = hell.split("[").join("\\\\\\[");
    hell = hell.split("]").join("\\\\\\]");
    hell = hell.split("'").join("\\\\\\'");
    //currentPlaying = currentPlaying.split("'").join("\\\\\\\\'");

	let args;
	if (currentPlaying.endsWith(".mkv"))
		args = [
			"-re",
			"-i", currentPlaying,
            "-vf", "subtitles=" + hell,
			"-c:v", "libx264",
			"-c:a", "aac", "-strict", "-2",
			"-f", "flv",
			rtmpServer
		];
	else
		args = [
			"-re",
			"-i", currentPlaying,
			"-c:v", "libx264",
			"-c:a", "aac", "-strict", "-2",
			"-f", "flv",
			rtmpServer
		];

    console.log("Spawning ffmpeg " + args.join(" "));
	ffmpeg = child_process.spawn("ffmpeg", args);

    let output = "";
    ffmpeg.stderr.on("data", data => {
        console.log(data.toString());
    });
    ffmpeg.stdout.on("data", data => {
        console.log(data.toString());
    });

    ffmpeg.on("error", (e) => {
        console.log(output);
		console.err(e);
		playNext();
	});

    ffmpeg.on("exit", () => {
        console.log(output);
		console.log("Finished")
		playNext();
	});
}

function getContents(path) {
	let allContents = fs.readdirSync(path);
	let folders = [];
	let files = [];
	for (let f of allContents)
	{
		try {
			let fStat = fs.statSync(_path.join(path, f));
			if (fStat.isDirectory())
				folders.push(f);
			else
				files.push(f);
		} catch(e) {
		}
	}
	return { folders: folders, files: files };
}

app.get('/', (req, res) => {
	res.sendFile('index.html', { root: __dirname + "/public" });
});

app.get('/queue/list', (req, res) => {
	let withPlaying = queue.slice(0);
	if (currentPlaying)
		withPlaying.splice(0, 0, currentPlaying);
	res.json(withPlaying);
});

app.post('/queue/remove', (req, res) => {
	let index = parseInt(req.body.index);
	if (index != NaN)
		queue.splice(index, 1);
	res.send("Done");
});

app.post('/queue/add', (req, res) => {
	let path = req.body.path;
	try {
		fs.accessSync(path, fs.constants.R_OK);
		if (fs.statSync(path).isDirectory())
			throw "nope.avi";
		queue.push(path);
		if (!currentPlaying)
			playNext();
		res.send("Added");
	} catch (e) {
		return res.status(403).send("File could not be accessed");
	}
});

//For directory and file listing
app.post('/fs/query', (req, res) => {
	let path = req.body.path;
	fs.readdir(path, (err, files) => {
		if (err)
			res.status(403).send("Folder could not be accessed");
		else {
			let contents = getContents(path);
			//res.setHeader('Content-Type', 'application/json');
			res.json(contents);
		}
	});
});

app.listen(3000, () => {
	console.log("Listening on 3000");
});

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs')
const { promisify } = require('util')
const unlinkAsync = promisify(fs.unlink);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname + '-' + Date.now())
    }
});

const app = express();
const upload = multer({ storage: storage }).single('ifcfile');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(cors());

var clients = [];
var files = [];

app.get('/status', (request, response) => response.json({ clients: clients.length }));

function eventsHandler(req, res, next) {
    var link = req.query.filename;
    var clientId = req.query.clientId;
    console.log('from events: ', link, clientId);
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);
    // res.write('hello');
    setInterval(() => {
        res.write('a');
    }, 1000);
    req.on('close', () => {
        clients.map(async (client, i) => {
            if (client.id == clientId) {
                clients.splice(i, 1);
                if (fs.existsSync('uploads/' + link)) {
                    var deleted = await unlinkAsync('uploads/' + link);
                    res.send(deleted);
                    console.log(`${clientId} Connection closed`);
                }
                else {
                    res.send('No file found');
                    console.log(`${clientId} Connection closed`);
                }
            }
        });
    });
}

app.get('/events', upload, eventsHandler);

app.get('/error', (req, res) => {
    var link = req.query.filename;
    var clientId = req.query.clientId;
    clients.map((d) => {
        console.log(d.id, d.file);
    })
    clients.map(async (client, i) => {
        if (client.id == clientId) {
            clients.splice(i, 1);
            if (fs.existsSync('uploads/' + link)) {
                var deleted = await unlinkAsync('uploads/' + link);
                res.send(deleted);
                console.log(`${clientId} Connection closed`);
            }
            else {
                res.send('No file found');
                console.log(`${clientId} Connection closed`);
            }
        }
    });
})

app.get('/api/file', (req, res) => {
    var filename = req.query.filename;
    var originalname = req.query.originalname;
    res.setHeader('Content-Disposition', 'attachment; filename=' + originalname);
    if (fs.existsSync('uploads/' + filename)) {
        res.sendFile(__dirname + '/uploads/' + filename);
    }
});

app.post('/api/upload', upload, (req, res) => {
    console.log('post route called');
    console.log(req.file);
    if (!req.file) {
        console.log("No file received");
        res.send("No file received");
    } else {
        const clientId = Date.now();
        const newClient = {
            id: clientId,
            file: req.file.filename,
            res
        };
        clients.push(newClient);
        res.send({ file: req.file, client: clientId });
    }
});

app.listen(process.env.PORT || 3000, () => console.log(`App started!`));
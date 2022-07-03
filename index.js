const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const port = 3000 || process.env.PORT;
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

app.use(cors({
    origin: '*'
}));

let clients = [];

app.get('/status', (request, response) => response.json({ clients: clients.length }));

function eventsHandler(request, response, next) {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    response.writeHead(200, headers);
    const data = `data: data123`;
    response.write(data);
    const clientId = Date.now();
    const newClient = {
        id: clientId,
        file:
            response
    };
    clients.push(newClient);
    request.on('close', () => {
        console.log(`${clientId} Connection closed`);
        clients = clients.filter(client => client.id !== clientId);
    });
}

app.get('/events', upload, eventsHandler, (req, res) => {
    console.log('hllo');
});



app.get('/api/upload', (req, res) => {
    console.log('route called');
    x = req.query.value;
    console.log(x);
    res.json({
        'message': x
    });
});

app.get('/api/delete', async (req, res) => {
    if (fs.existsSync('uploads/' + req.query.filename)) {
        var deleted = await unlinkAsync('uploads/' + req.query.filename);
        res.send(deleted);
    }
    else {
        res.send('No file found');
    }
});

app.post('/api/upload', upload, eventsHandler, (req, res) => {
    console.log('route called 1');
    if (!req.file) {
        console.log("No file received");
        return res.send({
            success: false
        });
    } else {
        console.log('file received');
        return res.send(req.file);
    }
});

app.listen(port, () => console.log(`app listening on port ${port}!`));
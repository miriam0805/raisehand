const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

// CORS 미들웨어 설정
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// 정적 파일 제공 설정
app.use(express.static('public'));
app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io/client-dist'));

// userpass.json 파일에 대한 라우트 추가
app.get('/userpass.json', (req, res) => {
    console.log('userpass.json 요청 받음');
    try {
        const fs = require('fs');
        const path = require('path');
        const userpassPath = path.join(__dirname, 'userpass.json');
        console.log('userpass.json 파일 경로:', userpassPath);
        
        if (!fs.existsSync(userpassPath)) {
            console.error('userpass.json 파일이 존재하지 않습니다.');
            return res.status(404).json({ error: '사용자 데이터 파일을 찾을 수 없습니다.' });
        }
        
        const userpassData = fs.readFileSync(userpassPath, 'utf8');
        const userData = JSON.parse(userpassData);
        console.log('userpass.json 데이터 로드 성공:', userData.users.length, '명의 사용자');
        console.log('사용자 목록:', userData.users.map(u => ({ username: u.username, initials: u.initials })));
        res.json(userData);
    } catch (error) {
        console.error('userpass.json 로드 오류:', error);
        res.status(500).json({ error: '사용자 데이터를 불러올 수 없습니다.' });
    }
});

let queue = []; // 대기자 명단

const processHandRaise = (socket, data) => {
    const { initial, name, newInput } = data; 
    let fullName;

    // 이니셜에 따라 처리
    switch(initial) {
        case '배틀':
            fullName = `${initial}-${name}`;
            break;
        case '손들기':
            fullName = `${initial}-${name}`;
            break;
        case '학원간 배틀':
            fullName = `${initial}-${name}`;
            break;
        default:
            fullName = `${initial}-${name}`;
    }

    // 대기열에 새 데이터 추가
    queue.push({ 
        id: socket.id, 
        name: fullName, 
        newInput: newInput 
    });
    
    // 모든 클라이언트에게 업데이트된 대기열 전송
    io.emit('update_queue', queue);

    // 요청한 클라이언트에게만 새로운 배틀 정보 전송
    io.to(socket.id).emit('new_battle_info', { 
        name: fullName, 
        newInput: newInput 
    });
};

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('raise_hand', (data) => {
        processHandRaise(socket, data);
    });

    socket.on('teacher_confirm', (studentName) => {
        if (queue.length > 0) {
            // 선택된 학생을 찾아서 제거
            queue = queue.filter(user => user.name !== studentName);
            io.emit('update_queue', queue);
        }
    });

    socket.on('disconnect', () => {
        queue = queue.filter(user => user.id !== socket.id);
        io.emit('update_queue', queue);
    });
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/student', (req, res) => {
    res.sendFile(__dirname + '/student.html');
});

app.get('/battle', (req, res) => {
    res.sendFile(__dirname + '/battle.html');
});

app.get('/hakwonbattle', (req, res) => {
    res.sendFile(__dirname + '/hakwonbattle.html');
});

app.get('/teacherbattle', (req, res) => {
    res.sendFile(__dirname + '/teacherbattle.html');
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`Server is running on ${HOST}:${PORT}`);
});




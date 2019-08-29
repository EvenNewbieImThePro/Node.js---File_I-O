/*
    평문의 파일을 암호화해 업로드하고 다운받을때는 복호화해서 다운로드
*/

const fs = require('fs');
const crypto = require('crypto');
const cryptoKey = "Avengers!";

function writeFile(path, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, data, (err) => {
            if(err) {
                return reject(err);
            }
            resolve(data);
        });
    });
}

function readFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve(data);
        });
    });
}

function encryptAES(str) {
    const cipher = crypto.createCipher('aes-256-cbc', cryptoKey);
    str = cipher.update(str, "utf8", "base64");
    return str + cipher.final("base64");
}

function decryptAES(encrypt) {
    const decipher = crypto.createDecipher('aes-256-cbc', cryptoKey);
    encrypt = decipher.update(encrypt, "base64", "utf8");
    return encrypt + decipher.final("utf8")
}

async function main() {
    const express = require('express');
    const bodyParser = require('body-parser');
    const path = require('path');
    const app = express();
    const multer = require('multer');   // 파일 업로드 모듈
    const upload = multer({dest: "upload/"}) // 파일 업로드 하는 문법 dest: 업로드할 폴더 
    const qs = require('querystring');
  
    await writeFile('./contents', '');

    app.use(bodyParser.urlencoded({ extended: true}));

    app.get('/', (req, res, next) => {
        res.sendFile(path.join(__dirname, './index.html'));
    });

    app.get('/api/contents', async (req, res, next) => {
        let contents = (await readFile('./contents')).toString('utf8');
        //const decipher = crypto.createDecipher('aes-256-cbc', cryptoKey);
        if (contents) {
            contents = decryptAES(contents);
        }
        res.send(contents.toString('utf8'));
    }); 

    app.get('/download/:filename', async (req, res, next) => {
        const filename = req.params.filename;
        try {
            let fileBuffer = (await readFile(`./final/${filename}`)).toString('utf8');

            fileBuffer = decryptAES(fileBuffer);

            res.setHeader('Content-disposition', `attachment; filename=${qs.escape(filename)}`);
            res.setHeader('Content-type', 'file/octet-stream');
            res.send(fileBuffer);
        } catch(err) {
            res.send('file not found');
        }     
    });

    app.post('/api/contents', upload.single("text"), async (req, res, next) => {
        let contents = req.file || req.body.contents;
        
        if (req.file) {
            contents = (await readFile(req.file.path)).toString('utf8');
            contents = encryptAES(contents);
            await writeFile(req.file.path, contents);

        } else {
            contents = decryptAES(contents);
        } 
        await writeFile('./contents', contents);
        if (req.file) {
            const date = new Date().getTime().toString();
            const hash = crypto.pbkdf2Sync("mypassword", date, 100000, 64, 'sha-256' ).toString('hex');
            fs.rename(req.file.path, `./final/${req.file.originalname}`, () => {});
        }
        res.redirect('/');
    });
    app.listen(3030);
}

main();
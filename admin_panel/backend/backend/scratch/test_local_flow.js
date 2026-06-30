const express = require('express');
const multer = require('multer');
const path = require('path');
const http = require('http');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer();
const partnerUpload = upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'aadharFront', maxCount: 1 },
  { name: 'aadharBack', maxCount: 1 },
  { name: 'panImage', maxCount: 1 },
  { name: 'policeVerification', maxCount: 1 }
]);

app.post('/api/auth/register', partnerUpload, (req, res) => {
  console.log('=== LOCAL SERVER RECEIVED REQUEST ===');
  console.log('req.body:', req.body);
  
  const normalizedBody = {};
  for (const key in req.body) {
    if (req.body[key] !== undefined && req.body[key] !== null) {
      const normalizedKey = key.trim().toLowerCase().replace(/[\s_-]/g, '');
      normalizedBody[normalizedKey] = req.body[key];
    }
  }
  console.log('normalizedBody:', normalizedBody);

  const aadharVal = req.body.aadharNumber || req.body.aadhaarNumber || normalizedBody['aadharnumber'] || normalizedBody['aadhaarnumber'] || normalizedBody['aadhar'] || normalizedBody['aadhaar'] || '';
  const panVal = req.body.panNumber || normalizedBody['pannumber'] || normalizedBody['pan'] || normalizedBody['pancard'] || '';
  const bankVal = req.body.bankName || normalizedBody['bankname'] || normalizedBody['bank'] || '';
  const accHolderVal = req.body.accountHolder || normalizedBody['accountholder'] || normalizedBody['accountholdername'] || normalizedBody['holdername'] || '';
  const accNumVal = req.body.accountNumber || normalizedBody['accountnumber'] || normalizedBody['accountno'] || normalizedBody['accnumber'] || normalizedBody['accno'] || '';
  const ifscVal = req.body.ifscCode || normalizedBody['ifsccode'] || normalizedBody['ifsc'] || '';

  console.log('aadharVal:', aadharVal);
  console.log('panVal:', panVal);
  console.log('bankVal:', bankVal);
  console.log('accHolderVal:', accHolderVal);
  console.log('accNumVal:', accNumVal);
  console.log('ifscVal:', ifscVal);

  res.json({ success: true });
});

const server = app.listen(3001, () => {
  // Send request
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const bodyParts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nHira\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="AAdhar NUmber"\r\n\r\n123456789012\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="Pan NUmber"\r\n\r\nABCDE1234F\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="Bank Name"\r\n\r\nState Bank of India\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="AccountHolder"\r\n\r\nTest Holder\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="Account Number"\r\n\r\n30291827361\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="IFSC code"\r\n\r\nSBIN0001234\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="profileImage"; filename="profile.png"\r\nContent-Type: image/png\r\n\r\nfake-image-content\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="aadharFront"; filename="aadhar_front.png"\r\nContent-Type: image/png\r\n\r\nfake-image-content\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="aadharBack"; filename="aadhar_back.png"\r\nContent-Type: image/png\r\n\r\nfake-image-content\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="panImage"; filename="pan.png"\r\nContent-Type: image/png\r\n\r\nfake-image-content\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="policeVerification"; filename="pv.png"\r\nContent-Type: image/png\r\n\r\nfake-image-content\r\n`,
    `--${boundary}--\r\n`
  ];
  const requestBody = bodyParts.join('');

  const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(requestBody)
    }
  }, (response) => {
    let data = '';
    response.on('data', chunk => data += chunk);
    response.on('end', () => {
      console.log('Response:', data);
      server.close();
      process.exit(0);
    });
  });
  req.write(requestBody);
  req.end();
});

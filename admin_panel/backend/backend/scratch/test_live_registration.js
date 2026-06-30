const https = require('https');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const rand = Math.floor(Math.random() * 1000000);
const phone = `7250${String(rand).padStart(6, '0')}`;
const email = `partner_${rand}@test.com`;

const bodyParts = [
  `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nTest Partner ${rand}\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="phone"\r\n\r\n${phone}\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="email"\r\n\r\n${email}\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="address"\r\n\r\n123 Street\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="state"\r\n\r\nDelhi\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="city"\r\n\r\nDelhi\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="locality"\r\n\r\nConnaught Place\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="password"\r\n\r\npassword123\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="AAdhar NUmber"\r\n\r\n123456789012\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="Pan NUmber"\r\n\r\nABCDE1234F\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="Bank Name"\r\n\r\nState Bank of India\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="AccountHolder"\r\n\r\nTest Holder\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="Account Number"\r\n\r\n30291827361\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="IFSC code"\r\n\r\nSBIN0001234\r\n`,
  
  // File attachments (empty but present to satisfy requirement)
  `--${boundary}\r\nContent-Disposition: form-data; name="profileImage"; filename="profile.png"\r\nContent-Type: image/png\r\n\r\nfake-image-content\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="aadharFront"; filename="aadhar_front.png"\r\nContent-Type: image/png\r\n\r\nfake-image-content\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="aadharBack"; filename="aadhar_back.png"\r\nContent-Type: image/png\r\n\r\nfake-image-content\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="panImage"; filename="pan.png"\r\nContent-Type: image/png\r\n\r\nfake-image-content\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="policeVerification"; filename="pv.png"\r\nContent-Type: image/png\r\n\r\nfake-image-content\r\n`,
  `--${boundary}--\r\n`
];

const requestBody = bodyParts.join('');

const req = https.request('https://partner-backend-2.onrender.com/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': Buffer.byteLength(requestBody)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Request failed:', e.message);
});

req.write(requestBody);
req.end();

const express = require('express');
const uploadRouter = require('../routes/upload');

async function runTest() {
  console.log('🧪 Starting integration tests for upload file validation...');

  const app = express();
  app.use(express.json());
  app.use('/api/upload', uploadRouter);

  const server = app.listen(3001, async () => {
    console.log('📡 Test server running on port 3001...');

    try {
      // 1. Test SVG upload (Should fail)
      console.log('\n--- Test Case 1: Uploading SVG file (Should fail) ---');
      const formDataSvg = new FormData();
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>';
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
      formDataSvg.append('image', svgBlob, 'test.svg');

      const resSvg = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formDataSvg
      });
      const bodySvg = await resSvg.json();
      console.log('SVG Upload Status:', resSvg.status);
      console.log('SVG Upload Response:', bodySvg);

      if (resSvg.status !== 400 || !bodySvg.message.includes('SVG files are not allowed')) {
        throw new Error('SVG file rejection test failed!');
      }
      console.log('✅ SVG file was rejected correctly.');

      // 2. Test PDF upload (Should fail)
      console.log('\n--- Test Case 2: Uploading PDF file (Should fail) ---');
      const formDataPdf = new FormData();
      const pdfBlob = new Blob(['%PDF-1.4 mock content'], { type: 'application/pdf' });
      formDataPdf.append('image', pdfBlob, 'document.pdf');

      const resPdf = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formDataPdf
      });
      const bodyPdf = await resPdf.json();
      console.log('PDF Upload Status:', resPdf.status);
      console.log('PDF Upload Response:', bodyPdf);

      if (resPdf.status !== 400 || !bodyPdf.message.includes('Only PNG, JPG, and JPEG')) {
        throw new Error('PDF file rejection test failed!');
      }
      console.log('✅ PDF file was rejected correctly.');

      // 3. Test PNG upload (Should succeed)
      console.log('\n--- Test Case 3: Uploading PNG file (Should succeed) ---');
      const formDataPng = new FormData();
      const pngBlob = new Blob(['mock png bytes'], { type: 'image/png' });
      formDataPng.append('image', pngBlob, 'image.png');

      const resPng = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formDataPng
      });
      const bodyPng = await resPng.json();
      console.log('PNG Upload Status:', resPng.status);
      console.log('PNG Upload Response:', bodyPng);

      if (resPng.status !== 201 || !bodyPng.success) {
        throw new Error('PNG file upload test failed!');
      }
      console.log('✅ PNG file was uploaded successfully.');

      console.log('\n🎉 All upload validation tests passed successfully!');

    } catch (err) {
      console.error('\n❌ Test execution failed:', err);
    } finally {
      server.close(() => {
        console.log('📡 Test server stopped.');
        process.exit(0);
      });
    }
  });
}

runTest();

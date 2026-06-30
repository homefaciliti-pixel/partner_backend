async function runLiveTest() {
  console.log('🧪 Starting live integration tests for upload file validation on Render...');

  try {
    // 1. Test SVG upload (Should fail)
    console.log('\n--- Test Case 1: Uploading SVG file (Should fail) ---');
    const formDataSvg = new FormData();
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>';
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
    formDataSvg.append('image', svgBlob, 'test.svg');

    const resSvg = await fetch('https://partner-backend-2.onrender.com/api/upload', {
      method: 'POST',
      body: formDataSvg
    });
    const bodySvg = await resSvg.json();
    console.log('SVG Upload Status:', resSvg.status);
    console.log('SVG Upload Response:', bodySvg);

    if (resSvg.status !== 400 || !bodySvg.message.includes('SVG files are not allowed')) {
      throw new Error('SVG file rejection test failed!');
    }
    console.log('✅ SVG file was rejected correctly by live server.');

    // 2. Test PNG upload (Should succeed)
    console.log('\n--- Test Case 2: Uploading PNG file (Should succeed) ---');
    const formDataPng = new FormData();
    const pngBlob = new Blob(['mock png bytes'], { type: 'image/png' });
    formDataPng.append('image', pngBlob, 'image.png');

    const resPng = await fetch('https://partner-backend-2.onrender.com/api/upload', {
      method: 'POST',
      body: formDataPng
    });
    const bodyPng = await resPng.json();
    console.log('PNG Upload Status:', resPng.status);
    console.log('PNG Upload Response:', bodyPng);

    if (resPng.status !== 201 || !bodyPng.success) {
      throw new Error('PNG file upload test failed!');
    }
    console.log('✅ PNG file was uploaded successfully to live server.');

    console.log('\n🎉 Live upload validation tests passed successfully!');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Live test execution failed:', err);
    process.exit(1);
  }
}

runLiveTest();

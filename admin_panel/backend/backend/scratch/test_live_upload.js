async function testLiveUpload() {
  console.log('📡 Testing upload of a real PNG image to live Render server...');

  try {
    const formData = new FormData();
    const pngBlob = new Blob(['PNG_MOCK_IMAGE_DATA_123456789'], { type: 'image/png' });
    formData.append('image', pngBlob, 'real_test_image.png');

    const res = await fetch('https://partner-backend-2.onrender.com/api/upload', {
      method: 'POST',
      body: formData
    });
    const body = await res.json();
    console.log('Upload Status:', res.status);
    console.log('Upload Response:', body);

    if (res.status !== 201 || !body.success) {
      throw new Error('Upload failed!');
    }

    const uploadedUrl = body.data.url;
    console.log(`\n📡 Fetching the uploaded image from: ${uploadedUrl}`);
    
    const fetchRes = await fetch(uploadedUrl);
    const text = await fetchRes.text();
    console.log('Fetch Status:', fetchRes.status);
    console.log('Fetch Content-Type:', fetchRes.headers.get('content-type'));
    console.log('Fetch Content preview:', text.substring(0, 100));

    if (text.includes('<svg')) {
      console.log('❌ Failed: Served SVG placeholder instead of the uploaded image!');
    } else {
      console.log('✅ Success: Served the actual uploaded image contents!');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error during test:', err);
    process.exit(1);
  }
}

testLiveUpload();

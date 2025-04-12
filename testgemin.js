// Test script for the /api/chat endpoint
// Run with Node.js: node test-chat-endpoint.js

const axios = require('axios');

async function testChatEndpoint() {
  console.log("Testing /api/chat endpoint...");
  
  try {
    const response = await axios('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: "Move 10 boxes from storage area A to loading dock B",
        conversation: [] // Start with an empty conversation array
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log("\n✅ Chat endpoint response received!");
    console.log("\nResponse data:");
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error("\n❌ Chat endpoint test failed:");
    console.error(error.message);
    
    console.log("\nDebugging tips:");
    console.log("1. Ensure your Next.js server is running on port 3000");
    console.log("2. Check that the environment variable GEMINI_API_KEY is set in your .env.local file");
    console.log("3. Verify the endpoint path is correct (/api/chat)");
    console.log("4. Look at your server logs for more detailed error information");
  }
}

// Run the test
testChatEndpoint();
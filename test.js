const axios = require('axios');

const runTest = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/path', {
      name: 'TAG1'
    });

    console.log('✅ Request Successful');
    console.log('──────────────────────────────');
    console.log('📌 Status Code:', response.status);
    console.log('📌 Path:', response.data.path.join(' → '));
    console.log('📌 Total Distance:', response.data.distance);
    console.log('\n🧭 Instructions:');
    console.table(response.data.instructions.map(inst => ({
      From: inst.from,
      To: inst.to,
      Instruction: inst.instruction,
      Distance: inst.distance,
      ShelfID: inst.shelfId
    })));

    console.log('\n📍 Start Node:', JSON.stringify(response.data.startNode, null, 2));
    console.log('\n🎯 Target Node:', JSON.stringify(response.data.targetNode, null, 2));

    console.log('\n🗄️ Destination Shelf:');
    console.log(JSON.stringify(response.data.destinationShelf, null, 2));

    console.log('\n📦 Matching Box:', response.data.matchingBox ?? 'None');

    console.log('\n🗺️ Path Shelves:');
    console.table(response.data.pathShelves.map(shelf => ({
      Node: shelf.nodeName,
      ShelfName: shelf.shelf?.name,
      Color: shelf.shelf?.color
    })));

  } catch (error) {
    console.error('❌ Request Failed');
    if (error.response) {
      console.error('🔴 Status Code:', error.response.status);
      console.error('🔴 Error Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('🔴 Network/Other Error:', error.message);
    }
  }
};

runTest();

app.get('/__test_data_interst__' , async(req , res) => {
  try{
    const __testData__ = [
      { date: "2025-06-13" ,
        online: 5132743,
        offline: 179968 ,
        humanReadableOnline: formatDuration(5132743),
        humanReadableOffline: formatDuration(179968)
      },
      { date: "2025-06-14" ,
        online: 4424118,
        offline: 61020 ,
        humanReadableOnline: formatDuration(4424118),
        humanReadableOffline: formatDuration(61020)
      },
      { date: "2025-06-15" ,
        online: 3363182 ,
        offline: 128299 ,
        humanReadableOnline: formatDuration(3363182),
        humanReadableOffline: formatDuration(128299)
      },
      { date: "2025-06-16" ,
        online: 3021837 ,
        offline: 1956 ,
        humanReadableOnline: formatDuration(3021837),
        humanReadableOffline: formatDuration(1956)
      },
    ]
    await Promise.all(__testData__.map(async (data) => {
      await LeetCodeYesterDayTimeStats.create(data);
      console.log("Inserted test data: ", data);
      })
    ).then(() => {
      res.status(200).json({ message: "Test data inserted successfully" }); 
    }).catch(error => {
      console.error("Error inserting test data: ", error);  
      res.status(500).json({ error: "Failed to insert test data" });
    });
  }catch(error){
    console.error(
      "error inserting test data: ", error
    )
  }
})

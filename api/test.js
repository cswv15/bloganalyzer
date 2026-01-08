// 간단한 테스트 API
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  return res.status(200).json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    method: req.method
  });
};

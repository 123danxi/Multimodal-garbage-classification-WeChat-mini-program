// utils.js
const baseUrl = "http://172.20.10.14:5000"; // 替换为你的服务器地址

// 图片检测接口
function detectImage(imagePath, callback) {
  wx.uploadFile({
    url: `${baseUrl}/detect`, // Flask 接口地址
    filePath: imagePath,
    name: 'file', // Flask 中 request.files 的键
    success: function (res) {
      if (res.statusCode === 200) {
        const data = JSON.parse(res.data); // 解析后端返回的数据
        callback(null, data);
      } else {
        callback(new Error(`HTTP ${res.statusCode}: ${res.data}`));
      }
    },
    fail: function (err) {
      callback(err);
    }
  });
}

module.exports = {
  detectImage
};

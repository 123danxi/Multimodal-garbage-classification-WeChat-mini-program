const utils = require('../../utils.js'); // 引入公共方法

Page({
  data: {

    base64imgurl: null,    // Base64格式的图片
    name_and_nums: ''      // 分类结果的文本汇总
  },

  // 跳转到聊天页面
  navigateToAi: function () {
   
  },

  // 选择图片
  chooseImage() {
    const that = this;
    wx.chooseImage({
      count: 1, // 允许用户选择 1 张图片
      sizeType: ['compressed'], // 返回压缩图
      sourceType: ['album', 'camera'], // 图片来源：相册或相机
      success(res) {
        const img_path = res.tempFilePaths[0]; // 获取临时图片路径
        that.setData({ base64imgurl: img_path }); // 显示图片
        console.log('图片选择成功:', img_path);

        // 自动提交图片
        that.uploadImage(img_path);
      },
      fail(err) {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 提交图片到后端
  uploadImage(filePath) {
    const that = this;
  
    if (!filePath) {
      wx.showToast({
        title: '图片路径无效',
        icon: 'none'
      });
      return;
    }
  
    wx.uploadFile({
      url: 'http://10.202.196.42:5000/upload', // Flask 服务器地址
      filePath: filePath, // 上传的文件路径
      name: 'file', // 文件名对应后端的接收字段
      success(res) {
        console.log('上传成功:', res);
  
        try {
          const data = JSON.parse(res.data); // 解析后端返回的 JSON 数据
  
          if (data.success) {
            const base64Image = data.detectionImage; // 后端返回的 Base64 图片字符串
            const nameAndNums = data.nameAndNums; // 后端返回的分类结果
  
            // **打印数据以确认其值**
            console.log('后端返回的 Base64 图片:', base64Image);
            console.log('后端返回的分类结果:', nameAndNums);
  
            // 跳转到结果页面并传递数据
            wx.navigateTo({
              url: '/pages/result/result',
              success: function (res) {
                console.log('检测成功');
                res.eventChannel.emit('sendDataToResultPage', {
                  base64Image: base64Image, // 返回的 Base64 图片
                  name_and_nums: nameAndNums
                });
              }
            });
          } else {
            console.error('检测失败:', data.error);
            wx.showToast({
              title: `检测失败: ${data.error}`,
              icon: 'none'
            });
          }
        } catch (e) {
          console.error('解析后端返回数据失败:', e);
          wx.showToast({
            title: '服务器返回数据错误',
            icon: 'none'
          });
        }
      },
      fail(err) {
        console.error('上传失败:', err);
        wx.showToast({
          title: '上传失败，请检查网络',
          icon: 'none'
        });
      }
    });
  },
  

  // 手动提交图片
  submitimg() {
    const img_path = this.data.base64imgurl; // 获取当前的图片路径

    if (!img_path) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }

    // 调用上传逻辑
    this.uploadImage(img_path);
  }
});

Page({
  data: {
    avatarUrl: '',     // 用于显示的图片路径
    name_and_nums: ''  // 分类结果的文本汇总
  },

  onLoad: function (options) {
    const that = this;
    const eventChannel = this.getOpenerEventChannel();

    // 接收主页面传递的数据
    eventChannel.on('sendDataToResultPage', function (data) {
      console.log('接收到数据:', data);

      const base64Image = data.base64Image; // Base64 图片字符串
      const nameAndNums = data.name_and_nums; // 分类结果

      // 将 Base64 图片转换为临时路径
      const filePath = that.convertBase64ToImage(base64Image);

      that.setData({
        avatarUrl: filePath, // 设置图片路径
        name_and_nums: nameAndNums // 设置分类结果
      });
    });
  },

  // 将 Base64 字符串转换为临时图片路径
  convertBase64ToImage(base64Image) {
    if (!base64Image) {
      console.error('Base64 图片字符串无效');
      return '';
    }

    try {
      // 去掉 Base64 前缀 `data:image/png;base64,`（如果有）
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

      // 将 Base64 数据写入临时文件
      const fileSystemManager = wx.getFileSystemManager();
      const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_image.png`;

      fileSystemManager.writeFileSync(tempFilePath, base64Data, 'base64');
      return tempFilePath;
    } catch (err) {
      console.error('Base64 转换失败:', err);
      wx.showToast({
        title: '图片加载失败',
        icon: 'none'
      });
      return '';
    }
  }
});

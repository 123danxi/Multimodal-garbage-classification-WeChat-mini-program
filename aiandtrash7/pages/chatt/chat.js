import * as THREE from '../../libs/three.weapp.js'
import gLTF from '../../jsm/loaders/GLTFLoader'
import { OrbitControls } from '../../jsm/controls/OrbitControls'
let window = THREE.global
let GLTFLoader = gLTF(THREE)
//import { GLTFLoader } from '../../jsm/loaders/GLTFLoader';

import CryptoJS from '../../miniprogram_npm/crypto-js/crypto-js';



Page({data: {
	messages: [], // 聊天消息数组
	inputMessage: '', // 输入的消息
	audioBase64: '',
	playAudio: [], // 初始化为数组
	canvasId: '' ,// 添加 canvasId 的初始化
	audioCtx: null, // 初始化 audioCtx
	base64Image: '', // Base64 image to display
  name_and_nums: '' // Classification result text
},
onLoad: function () {
	var that = this;
	this.setData({ audioCtx: wx.createInnerAudioContext() });
	this.audioCtx = wx.createInnerAudioContext();
	wx.createSelectorQuery()
		.select('#c')
		.node()
		.exec((res) => {
			const canvas = new THREE.global.registerCanvas(res[0].node);
			that.setData({ canvasId: canvas.id });
			that.render(canvas, THREE);
		});
		
},
//-------------------------------------
givepicTapHandler: function () {
  // 选择图片
  wx.chooseImage({
    count: 1,
    sizeType: ['original', 'compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0];
      // 显示图片到聊天框
      this.setData({
        messages: [...this.data.messages, { content: '', isUser: true, imgUrl: tempFilePath }]
      });
      // 提交图片到后端
      this.uploadImage(tempFilePath);
    }
  });
},

// 提交图片到后端
uploadImage(filePath) {
  if (!filePath) {
    wx.showToast({
      title: '图片路径无效',
      icon: 'none'
    });
    return;
  }

  wx.uploadFile({
    url: 'http://10.203.232.125:5000/upload',
    filePath: filePath,
    name: 'file',
    success: (res) => {
      console.log('上传成功:', res);
      try {
        const data = JSON.parse(res.data);
        if (data.success) {
          const base64Image = data.detectionImage;
          const nameAndNums = data.nameAndNums;
          console.log('后端返回的 Base64 图片:', base64Image);
          console.log('后端返回的分类结果:', nameAndNums);
          // 显示处理后的图片到聊天框
          this.setData({
            messages: [...this.data.messages, { content: '', isUser: false, imgUrl: 'data:image/jpeg;base64,' + base64Image }]
          });
          // 调用图像理解的API
          this.callImageUnderstandingAPI(base64Image);
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
    fail: (err) => {
      console.error('上传失败:', err);
      wx.showToast({
        title: '上传失败，请检查网络',
        icon: 'none'
      });
    }
  });
},

// 调用图像理解的API
callImageUnderstandingAPI(base64Image) {
  const apiPayload = {
    model: "glm-4v-plus",
    messages: [{
      role: "user",
      content: [{
        type: "image_url",
        image_url: {
          url: "data:image/jpeg;base64," + base64Image
        }
      }, {
        type: "text",
        text: "你是垃圾分类助手垃圾分为四类（厨余垃圾、可回收垃圾、有害垃圾、其他垃圾）。阅读以下资料：【可回收垃圾有：涵盖废纸、废塑料、废金属、废包装物、废旧纺织物、废弃电器电子产品、废玻璃、废纸塑铝复合包装等。有害垃圾有：废电池（镉镍电池、氧化汞电池、铅蓄电池等），废荧光灯管（日光灯管、节能灯等），废温度计，废血压计，废药品及其包装物，废油漆、溶剂及其包装物，废杀虫剂、消毒剂及其包装物，废胶片及废相纸等。厨余垃圾有：各种实物。其他都是其他垃圾。】【处理厨余垃圾时，如果是从事餐饮服务、集体供餐等活动的场所以及农贸市场、农产品批发市场应当分类设置易腐垃圾、其他垃圾收集容器，如果不是则应投放至易腐垃圾密闭收集容器。处理可回收垃圾时，可以投放至指定的可回收垃圾收集点或者交给专门的回收经营者。处理有害垃圾时，要单独收集，投放至指定的有害垃圾收集点，投放时要注意避免损坏容器，防止有害垃圾泄漏。】如果图片上有文字标注垃圾类型，请你用句型：这是【类型】垃圾，你可以这样处理：（根据阅读资料和识别出的物体给出最佳答案，专业，不要分点）......。如果图片上没有文字标注，请你先识别出物体，并大致分类，请你用句型：这是【什么物体】，可能是【类型】垃圾，你可以这样处理：（根据阅读资料和识别出的物体给出最佳答案，专业，不要分点）......"
      }]
    }],
    request_id: "unique_request_id_" + new Date().getTime(),
    stream: false,
  };

  wx.request({
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    method: 'POST',
    data: apiPayload,
    header: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer de3c3517622994008c396e426008139e.ntv9owK8kJUagCTb'
    },
    success: (res) => {
      if (res.statusCode === 200) {
        const analysisText = res.data.choices[0].message.content;
        this.setData({
          messages: [...this.data.messages, { content: analysisText, isUser: false }]
        });
        this.linkXunfeiSocket(res.data.choices[0].message.content);
      } else {
        console.error("API 请求失败", res);
      }
    },
    fail: (err) => {
      console.error("请求失败", err);
    }
  });
},

//////////---------------------------------------

bindInput: function (e) {
	this.setData({
		inputMessage: e.detail.value
	});
},
navigateToCode1: function () {
	wx.navigateTo({
		url: '/pages/code1/code1',
	});
},
	sendMessage: function () {
	if (this.data.inputMessage.trim() !== '') {
		let that = this;

		// 添加用户消息到 messages
		this.setData({
			messages: [...this.data.messages, { content: this.data.inputMessage, isUser: true }],
		});

		wx.request({
			url: "https://spark-api-open.xf-yun.com/v1/chat/completions",
			method: "POST",
			header: {
				"Authorization": "Bearer FxlzsJvHgFGjCCybNmvC:DwlVlhzDzYHPBoSoEFfe",
				"Content-Type": "application/json"
			},
			data: {
				"max_tokens": 4096,
				"top_k": 4,
				"temperature": 0.5,
				"messages": [
					{
						"role": "system",
						"content": "你是垃圾分类助手垃圾分为四类（厨余垃圾、可回收垃圾、有害垃圾、其他垃圾）。阅读以下资料：【可回收垃圾有：涵盖废纸、废塑料、废金属、废包装物、废旧纺织物、废弃电器电子产品、废玻璃、废纸塑铝复合包装等。有害垃圾有：废电池（镉镍电池、氧化汞电池、铅蓄电池等），废荧光灯管（日光灯管、节能灯等），废温度计，废血压计，废药品及其包装物，废油漆、溶剂及其包装物，废杀虫剂、消毒剂及其包装物，废胶片及废相纸等。厨余垃圾有：各种实物。其他都是其他垃圾。】【处理厨余垃圾时，如果是从事餐饮服务、集体供餐等活动的场所以及农贸市场、农产品批发市场应当分类设置易腐垃圾、其他垃圾收集容器，如果不是则应投放至易腐垃圾密闭收集容器。处理可回收垃圾时，可以投放至指定的可回收垃圾收集点或者交给专门的回收经营者。处理有害垃圾时，要单独收集，投放至指定的有害垃圾收集点，投放时要注意避免损坏容器，防止有害垃圾泄漏。】请你用句型：这是【类型】垃圾，你可以这样处理：（根据阅读资料和识别出的物体给出最佳答案，专业，不要分点）......"
					},
					{
						"role": "user",
						"content": this.data.inputMessage
					}
				],
				"model": "4.0Ultra"
			},
			success(res) {
				if (res.data && res.data.choices.length > 0) {
					that.setData({
						messages: [...that.data.messages, { content: res.data.choices[0].message.content, isUser: false }]
					});
					that.linkXunfeiSocket(res.data.choices[0].message.content); // 调用语音合成
				}
			},
			fail(err) {
				console.error('请求失败', err);
			}
		});
		
		// 清空输入框
		this.setData({
			inputMessage: ''
		});
	}
	},

async getWebsocketUrl() {
	// const apiKey = write your apikey here;
	// const apiSecret = write your api secret here; 
	const url = 'wss://tts-api.xfyun.cn/v2/tts';
	const host = 'tts-api.xfyun.cn';
	const date = new Date().toGMTString();
	const algorithm = 'hmac-sha256';
	const headers = 'host date request-line';
	const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/tts HTTP/1.1`;
	const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, apiSecret);
	const signature = CryptoJS.enc.Base64.stringify(signatureSha);
	const authorizationOrigin = `api_key="${apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
	const authorization = this.base64_encode(authorizationOrigin);
	return `${url}?authorization=${authorization}&date=${date}&host=${host}`;
},
base64_encode(str) {
	var c1, c2, c3;
	var base64EncodeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
	var i = 0, len = str.length, strin = '';
	while (i < len) {
		c1 = str.charCodeAt(i++) & 0xff;
		if (i == len) {
			strin += base64EncodeChars.charAt(c1 >> 2);
			strin += base64EncodeChars.charAt((c1 & 0x3) << 4);
			strin += '==';
			break;
		}
		c2 = str.charCodeAt(i++);
		if (i == len) {
			strin += base64EncodeChars.charAt(c1 >> 2);
			strin += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
			strin += base64EncodeChars.charAt((c2 & 0xf) << 2);
			strin += '=';
			break;
		}
		c3 = str.charCodeAt(i++);
		strin += base64EncodeChars.charAt(c1 >> 2);
		strin += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
		strin += base64EncodeChars.charAt(((c2 & 0xf) << 2) | ((c3 & 0xc0) >> 6));
		strin += base64EncodeChars.charAt(c3 & 0x3f);
	}
	return strin;
},
async linkXunfeiSocket(text) {
	console.log('请求3语音合成成功'); // 添加日志输出
	const url = await this.getWebsocketUrl();
	const XunfeiSocketTask = wx.connectSocket({
		url: encodeURI(url),
		header: {
			'content-type': 'application/json'
		}
	});
	this.xunfeiSocketTask = XunfeiSocketTask;
	this.initXunFei(this.xunfeiSocketTask, text);
},
initXunFei(xunfeiSocketTask, text) {
	xunfeiSocketTask.onMessage(res => {
		this.result(res.data);
	});
	xunfeiSocketTask.onOpen(() => {
		this.webSocketSend(text);
	});
	xunfeiSocketTask.onClose(() => {
		this.setData({ audioBase64: '' });
	});
	xunfeiSocketTask.onError(err => {
		console.error('讯飞连接错误', err);
	});
},
webSocketSend(text) {
	const params = {
		common: {
			app_id: 'write your app id here' 
		},
		business: {
			aue: 'lame',
			sfl: 1,
			vcn: 'xiaoyan',
			tte: 'UTF8'
		},
		data: {
			status: 2,
			text: CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(text))
		}
	};
	this.xunfeiSocketTask.send({
		data: JSON.stringify(params),
		success: res => {
			console.log('发出讯飞消息');
		},
		fail: err => {
			console.error('发出讯飞消息失败', err);
		}
	});
},
result(resultData) {
	let jsonData = JSON.parse(resultData);

	// 判断合成是否成功
	if (jsonData.code !== 0) {
			console.log(`${jsonData.code}: ${jsonData.message}`);
			return;
	}

	// 合并接收到的 base64 音频数据
	this.setData({
			audioBase64: this.data.audioBase64 + jsonData.data.audio
	});

	// 判断是否是最后一个分片
	if (jsonData.data.status === 2) {
			// 将 base64 转化成 ArrayBuffer
			const arrayBuffer = wx.base64ToArrayBuffer(this.data.audioBase64);
			const filePath = `${wx.env.USER_DATA_PATH}/${new Date().getTime()}.mp3`;

			// 写入文件系统
			wx.getFileSystemManager().writeFile({
					filePath: filePath,
					data: arrayBuffer,
					encoding: 'binary',
					success: () => {
							// 播放音频
							this.audioCtx.src = filePath;
							this.audioCtx.play();

							// 更新播放音频数组
							this.setData({
									playAudio: [...this.data.playAudio, filePath],
									audioBase64: '' // 清空已处理的音频数据
							});
					},
					fail: (err) => {
							console.error('写文件失败', err);
					}
			});
	}
},

//在这里加入功能：


onUnload: function () {
	THREE.global.clearCanvas();
	THREE.global.unregisterCanvas(this.data.canvasId);
},
	render(canvas,THREE) {
		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		// renderer.setSize(canvas.width, canvas.height);
		renderer.gammaOutput = true;

		const fov = 45;
		const aspect = 2;  // the canvas default
		const near = 0.1;
		const far = 100;
		const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
		camera.position.set(0,0, 0);

		//旋转
		const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
		controls.enableZoom = false;
		controls.screenSpacePanning = false;
		controls.maxPolarAngle = Math.PI / 2;
		controls.update();
		//------------

		const clock = new THREE.Clock();

		const scene = new THREE.Scene();

		{
			const color = 0xFFFFFF;
			const intensity = 1;
			const light = new THREE.DirectionalLight(color, intensity);
			light.position.set(5, 10, 2);
			scene.add(light);
			scene.add(light.target);
		}

    //背景
     const bg = new THREE.TextureLoader().load('/gltf/background.jpg');
     scene.background = bg;
		 
		 //light
		 const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff,0.1);
        hemiLight.position.set(0, 50, 0);
        scene.add(hemiLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
        dirLight.position.set(-8, 12, 8);
        scene.add(dirLight);

			
			var gltfLoader = new GLTFLoader();
					
			gltfLoader.load('https://a.unity.cn/client_api/v1/buckets/90610f25-0caf-40ac-ae26-8f8a9724dd54/content/hop1.glb', (gltf) => {
        const model = gltf.scene;
        model.position.set(0,-0.5,-2.5);
     
					
				let mixer = new THREE.AnimationMixer(model);
					const controls = new OrbitControls(camera,renderer.domElement)
					   // 遍历模型并设置材质
					          // 设置动画
				gltf.animations.forEach((clip) => {
				  mixer.clipAction(clip).play();
				});
					
				scene.add(model);
					
					          // 渲染循环中更新动画混合器
				function rrender() {
					camera.aspect = canvas.clientWidth / canvas.clientHeight;
					camera.updateProjectionMatrix();
					renderer.render(scene, camera);
					mixer.update(0.001); // 更新动画混合器
					canvas.requestAnimationFrame(rrender);
					controls.update();
				}
					
				canvas.requestAnimationFrame(rrender);
			});
			
		  function update() {
			  if (mixer) {
				  mixer.update(clock.getDelta());
			  }
			  renderer.render(scene, camera);
			  requestAnimationFrame(update);
		}
	
		// 获取鼠标位置的函数
		/*function getMousePos(e) {
			return { x: e.clientX, y: e.clientY };
		}*/
	
		// 移动关节的函数
		function moveJoint(mouse, joint, degreeLimit) {
			let degrees = getMouseDegrees(mouse.x, mouse.y, degreeLimit);
			joint.rotation.y = THREE.Math.deg
		}
	
		function animate() {
			canvas.requestAnimationFrame(animate);
			var mixerUpdateDelta = clock.getDelta();
			for (var i = 0; i < mixers.length; ++i) {
					mixers[i].update(mixerUpdateDelta);
			}
			renderer.render(worldScene, camera);
	}



		function render() {

			camera.aspect = canvas.width / canvas.height;
			camera.updateProjectionMatrix();
			
			controls.update();
			renderer.render(scene, camera);
			canvas.requestAnimationFrame(render);
		}

		canvas.requestAnimationFrame(render);
	}
})

wx.showModal({
  title: '欢迎使用ai垃圾分类助手',
  content: '一起聊天吧~',
  success (res) {
    if (res.confirm) {
      console.log('用户点击确定')
    } else if (res.cancel) {
      console.log('用户点击取消')
    }
  }
})

from flask import Flask, request, jsonify
import os
import base64
import subprocess
import shutil
from werkzeug.utils import secure_filename

app = Flask(__name__)

# 设置上传文件保存路径
UPLOAD_FOLDER = r'C:\yolov5\yolov5-6.0\data\images'
RESULT_FOLDER = r'C:\yolov5\yolov5-6.0\runs\detect'
DETECT_SCRIPT = r'C:\yolov5\yolov5-6.0\detect.py'

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['RESULT_FOLDER'] = RESULT_FOLDER
app.config['DETECT_SCRIPT'] = DETECT_SCRIPT
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}

def clear_result_folder(folder_path):
    """清空指定文件夹内容"""
    if os.path.exists(folder_path):
        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)  # 删除文件或符号链接
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)  # 删除文件夹及其内容
            except Exception as e:
                print(f"Failed to delete {file_path}. Reason: {e}")

def allowed_file(filename):
    """检查文件是否为允许的格式"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/upload', methods=['POST'])
def upload_file():
    # 启动时清空结果文件夹
    clear_result_folder(RESULT_FOLDER)
    
    """处理文件上传和目标检测"""
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'})

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'})

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(save_path)  # 保存图片到指定路径

        # 调用 YOLOv5 的 detect.py 脚本进行检测
        try:
            result = subprocess.run(
                ['python', app.config['DETECT_SCRIPT'], '--source', save_path, '--save-txt'],
                check=True,
                capture_output=True,  # 捕获输出以便调试
                text=True
            )
            print(result.stdout)  # 打印 YOLOv5 脚本输出（调试用）

            # 提取分类结果
            classification_result = parse_yolo_output(result.stdout)
            if not classification_result:
                classification_result = "分类结果未知"  # 如果无法提取分类结果，设置默认值

        except subprocess.CalledProcessError as e:
            print(e.stderr)  # 打印错误信息（调试用）
            return jsonify({'success': False, 'error': 'Detection script failed'})

        # 获取检测结果图片
        result_dir = os.path.join(app.config['RESULT_FOLDER'], 'exp')  # 假定 YOLOv5 输出到 exp 文件夹
        if not os.path.exists(result_dir):
            return jsonify({'success': False, 'error': 'Result folder not found'})

        result_files = [f for f in os.listdir(result_dir) if allowed_file(f)]
        if result_files:
            result_img_path = os.path.join(result_dir, result_files[0])  # 取第一张检测结果图片
            with open(result_img_path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            print(result_img_path)
            # 将图片以Base64编码返回给前端
            return jsonify({
                'success': True,
                'detectionImage': encoded_string,  # 返回Base64编码的图片
                'nameAndNums': classification_result  # 返回分类结果
            })

        return jsonify({'success': False, 'error': 'No result image found'})

    return jsonify({'success': False, 'error': 'Invalid file format'})

def parse_yolo_output(output):
    """解析 YOLOv5 的输出，提取分类结果"""
    try:
        lines = output.split('\n')
        results = []
        for line in lines:
            if "class" in line:  # 假设 YOLO 输出中包含分类结果的关键词
                results.append(line.strip())
        return "; ".join(results) if results else None
    except Exception as e:
        print(f"Error parsing YOLOv5 output: {e}")
        return None

if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=5000, debug=False)  # 关闭 debug 模式以避免重复启动
    except Exception as e:
        print(f"Error: {e}")

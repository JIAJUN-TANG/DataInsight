#!/usr/bin/env python3
"""
Python 后端打包脚本
使用 PyInstaller 将 Python 代码打包为可执行文件
"""
import os
import subprocess
import sys
import shutil

def build_python_backend():
    """打包 Python 后端为可执行文件"""
    # 确保在项目根目录
    project_root = os.path.abspath(os.path.dirname(__file__))
    python_backend_dir = os.path.join(project_root, 'python_backend')
    build_dir = os.path.join(python_backend_dir, 'build')
    dist_dir = os.path.join(python_backend_dir, 'dist')
    
    # 清理旧的构建结果
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)
    if os.path.exists(dist_dir):
        shutil.rmtree(dist_dir)
    
    # 安装依赖
    print("安装 Python 依赖...")
    requirements_file = os.path.join(python_backend_dir, 'requirements.txt')
    print(f"使用依赖文件: {requirements_file}")
    subprocess.run([
        sys.executable, '-m', 'pip', 'install', '-r', requirements_file
    ], check=True)
    
    # 安装 PyInstaller
    print("安装 PyInstaller...")
    subprocess.run([
        sys.executable, '-m', 'pip', 'install', 'pyinstaller'
    ], check=True)
    
    # 打包 Python 后端
    print("打包 Python 后端...")
    api_py = os.path.join(python_backend_dir, 'api.py')
    
    # 使用 PyInstaller 打包
    result = subprocess.run([
        sys.executable, '-m', 'PyInstaller',
        '--name', 'api',
        '--onefile',
        '--distpath', dist_dir,
        '--workpath', build_dir,
        api_py
    ], check=False)
    
    if result.returncode != 0:
        print("打包失败，请查看上面的错误信息")
        return False
    
    print("Python 后端打包成功!")
    print(f"可执行文件路径: {os.path.join(dist_dir, 'api.exe')}")
    
    return True

if __name__ == "__main__":
    success = build_python_backend()
    if not success:
        sys.exit(1)
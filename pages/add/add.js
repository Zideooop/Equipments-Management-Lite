/**
 * 新增/编辑设备页面
 * 处理设备信息的添加和编辑功能
 */
// 初始化云开发环境
wx.cloud.init()
const db = wx.cloud.database()
const _ = db.command // 引入数据库命令对象
const cloudPathPrefix = 'equipment-images/' // 云存储图片路径前缀

const app = getApp();
const { safeBack } = require('../../utils/navigation.js');
const { AppUtils } = require('../../utils/AppUtils.js');

// 选择器配置抽象 - 集中管理所有选择器信息
const SELECTOR_CONFIG = {
  type: {
    options: ['电子设备', '机械设备', '工具器材', '其他'],
    field: 'type',
    storageKey: 'customTypeOptions',
    title: '选择器材类型'
  },
  location: {
    options: ['仓库A', '仓库B', '实验室1', '实验室2', '办公室'],
    field: 'location',
    storageKey: 'customLocationOptions',
    title: '选择存放位置'
  },
  status: {
    options: ['在库', '借出', '维修', '报废'],
    field: 'status',
    storageKey: 'customStatusOptions',
    title: '选择状态'
  },
  specification: {
    options: ['标准型', '加强型', '经济型', '定制型'],
    field: 'specification',
    storageKey: 'customSpecificationOptions',
    title: '选择规格型号'
  }
};

// 操作记录管理器 - 专门处理操作日志相关功能
class OperationLogManager {
  constructor(page) {
    this.page = page;
    this.logStorageKey = 'activityLogs';
    this.maxLogCount = 100; // 最大日志数量限制
  }
  
  // 添加操作日志
  addLog(equipment, action) {
    if (!equipment || !equipment.id || !action) return false;
    
    const log = {
      id: `log-${Date.now()}`,
      equipmentId: equipment.id,
      equipmentName: equipment.name || '未知设备',
      action,
      time: AppUtils.formatDate(),
      user: app.globalData.userInfo?.username || '未知用户'
    };
    
    try {
      let logs = AppUtils.storage(this.logStorageKey, undefined, 'array');
      logs.unshift(log);
      
      // 限制日志数量，只保留最近N条
      if (logs.length > this.maxLogCount) {
        logs = logs.slice(0, this.maxLogCount);
      }
      
      // 保存日志并同步到全局数据
      AppUtils.storage(this.logStorageKey, logs, 'array');
      app.globalData.activityLog = logs;
      
      // 触发日志更新事件
      app.globalEvent.emit('logUpdated', log);
      return true;
    } catch (error) {
      console.error('记录操作日志失败:', error);
      return false;
    }
  }
  
  // 获取设备相关日志
  getEquipmentLogs(equipmentId) {
    if (!equipmentId) return [];
    
    const logs = AppUtils.storage(this.logStorageKey, undefined, 'array');
    return AppUtils.safeArray(logs).filter(log => log.equipmentId === equipmentId);
  }
  
  // 清空指定设备的日志
  clearEquipmentLogs(equipmentId) {
    if (!equipmentId) return false;
    
    let logs = AppUtils.storage(this.logStorageKey, undefined, 'array');
    logs = AppUtils.safeArray(logs).filter(log => log.equipmentId !== equipmentId);
    
    return AppUtils.storage(this.logStorageKey, logs, 'array');
  }
}

// 图片管理器 - 专门处理图片选择、压缩和上传
class ImageManager {
  constructor(page) {
    this.page = page;
    this.cloudPathPrefix = cloudPathPrefix;
    this.maxSize = 2 * 1024 * 1024; // 图片最大尺寸限制2MB
    this.maxWidth = 800; // 图片最大宽度
    this.maxHeight = 800; // 图片最大高度
  }
  
  // 验证文件路径是否有效（同时支持临时路径和云路径）
  isValidFilePath(path) {
    if (!path || typeof path !== 'string' || path.trim() === '') {
      return false;
    }
    
    // 支持微信临时文件路径和云存储路径
    return path.startsWith('wxfile://') || path.startsWith('cloud://');
  }
  
  // 从指定来源选择图片
  chooseImage(sourceType) {
    const that = this;
    const page = this.page;
    
    if (page.data.isUploading) return;
    
    return new Promise((resolve, reject) => {
      wx.chooseImage({
        count: 1, // 只允许选择1张图片
        sizeType: ['compressed'], // 压缩图
        sourceType: [sourceType],
        success(res) {
          // 隐藏选择菜单
          page.hideImageSourceMenu();
          
          if (!res.tempFilePaths || res.tempFilePaths.length === 0) {
            AppUtils.showToast('未获取到图片');
            console.error('选择图片成功但未获取到临时路径', res);
            reject(new Error('未获取到图片路径'));
            return;
          }
          
          const tempFilePath = res.tempFilePaths[0];
          resolve(tempFilePath);
        },
        fail(err) {
          console.error('选择图片失败:', err);
          page.hideImageSourceMenu();
          
          // 忽略用户取消操作的错误
          if (err.errMsg !== 'chooseImage:fail cancel') {
            AppUtils.showToast('选择图片失败');
            reject(err);
          }
        }
      });
    });
  }
  
  // 检查图片大小
  checkImageSize(tempFilePath) {
    return new Promise((resolve, reject) => {
      const fs = wx.getFileSystemManager();
      fs.getFileInfo({
        filePath: tempFilePath,
        success(fileInfo) {
          if (!fileInfo || typeof fileInfo.size === 'undefined') {
            AppUtils.showToast('文件信息不完整');
            reject(new Error('文件信息不完整'));
            return;
          }
          
          if (fileInfo.size > this.maxSize) {
            AppUtils.showToast('图片大小不能超过2MB');
            reject(new Error('图片过大'));
            return;
          }
          
          resolve(tempFilePath);
        },
        fail(err) {
          console.error('获取文件信息失败:', err);
          AppUtils.showToast('无法处理图片');
          reject(err);
        }
      });
    });
  }
  
  // 压缩图片
  compressImage(tempFilePath) {
    const that = this;
    const page = this.page;
    
    return new Promise((resolve, reject) => {
      page.setData({ isUploading: true });
      
      wx.compressImage({
        src: tempFilePath,
        quality: 70,
        success(res) {
          // 预览压缩后的图片尺寸
          wx.getImageInfo({
            src: res.tempFilePath,
            success(imageInfo) {
              let { width, height } = imageInfo;
              const { canvasCtx, canvas } = page.data;
              
              // 计算缩放比例
              if (width > that.maxWidth || height > that.maxHeight) {
                const scale = Math.min(that.maxWidth / width, that.maxHeight / height);
                const newWidth = width * scale;
                const newHeight = height * scale;
                
                // 调整canvas尺寸
                canvas.width = newWidth;
                canvas.height = newHeight;
                
                // 使用Canvas 2D接口进行图片缩放
                const img = canvas.createImage();
                img.src = res.tempFilePath;
                img.onload = () => {
                  canvasCtx.drawImage(img, 0, 0, newWidth, newHeight);
                  wx.canvasToTempFilePath({
                    x: 0,
                    y: 0,
                    width: newWidth,
                    height: newHeight,
                    destWidth: newWidth,
                    destHeight: newHeight,
                    canvasId: 'imageCanvas',
                    success(canvasRes) {
                      page.setData({
                        imageTempPath: canvasRes.tempFilePath,
                        isUploading: false
                      });
                      resolve(canvasRes.tempFilePath);
                    },
                    fail(err) {
                      console.error('图片缩放失败:', err);
                      page.setData({
                        imageTempPath: res.tempFilePath,
                        isUploading: false
                      });
                      resolve(res.tempFilePath);
                    }
                  }, page);
                }
              } else {
                page.setData({
                  imageTempPath: res.tempFilePath,
                  isUploading: false
                });
                resolve(res.tempFilePath);
              }
            },
            fail(err) {
              console.error('获取图片信息失败:', err);
              page.setData({
                imageTempPath: tempFilePath,
                isUploading: false
              });
              resolve(tempFilePath);
            }
          });
        },
        fail(err) {
          console.error('压缩图片失败:', err);
          page.setData({
            imageTempPath: tempFilePath,
            isUploading: false
          });
          resolve(tempFilePath);
        }
      });
    });
  }
  
  // 上传图片到微信云存储
  uploadImageToCloud(tempFilePath) {
    return new Promise((resolve, reject) => {
      // 检查路径有效性
      if (!this.isValidFilePath(tempFilePath)) {
        const error = new Error('无效的图片路径: ' + tempFilePath);
        console.error(error);
        reject(error);
        return;
      }
      
      // 如果已经是云路径，直接返回
      if (tempFilePath.startsWith('cloud://')) {
        resolve(tempFilePath);
        return;
      }
      
      // 检查文件是否存在
      const fs = wx.getFileSystemManager();
      try {
        fs.accessSync(tempFilePath, fs.constants.F_OK);
      } catch (err) {
        const error = new Error('图片文件不存在: ' + tempFilePath);
        console.error(error, err);
        reject(error);
        return;
      }
      
      // 生成唯一的文件名（避免重复）
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000)
      const extName = tempFilePath.split('.').pop() || 'jpg'; // 确保有扩展名
      const cloudPath = `${this.cloudPathPrefix}${timestamp}-${random}.${extName}`

      try {
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: res => {
            if (res.fileID) {
              resolve(res.fileID)
            } else {
              reject(new Error('上传失败，未获取到fileID'))
            }
          },
          fail: err => {
            console.error('云存储上传失败:', err)
            reject(new Error(`上传失败: ${err.errMsg}`))
          }
        })
      } catch (err) {
        console.error('上传过程异常:', err);
        reject(new Error(`上传异常: ${err.message}`));
      }
    })
  }
  
  // 移除图片
  removeImage() {
    const page = this.page;
    
    return new Promise((resolve) => {
      // 震动反馈增强用户感知
      wx.vibrateShort();
      
      wx.showModal({
        title: '移除图片',
        content: '确定要删除这张图片吗？',
        confirmText: '删除',
        confirmColor: '#ff3b30', // 使用红色突出删除操作
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            page.setData({ imageTempPath: '' });
            AppUtils.showToast('图片已删除', 'none', 1500);
            resolve(true);
          } else {
            resolve(false);
          }
        },
        complete: () => {
          page.hideImageSourceMenu();
        }
      });
    });
  }
  
  // 预览图片
  previewImage(tempFilePath) {
    if (!tempFilePath) return;
    
    wx.previewImage({
      urls: [tempFilePath],
      current: tempFilePath,
      fail: (err) => {
        console.error('预览图片失败:', err);
        AppUtils.showToast('预览失败');
      }
    });
  }
}

Page({
  data: {
    equipment: {
      id: '',
      code: '', // 器材编号
      name: '',
      type: '',
      location: '',
      quantity: 1,
      status: '',
      specification: '',
      remarks: '',
      createTime: '',
      updateTime: '',
      imageUrl: '', // 存储图片的云文件ID
    },
    imageTempPath: '', // 存储器材图片临时路径
    isUploading: false, // 防止重复上传
    
    // 图片来源选择菜单状态
    showImageSourceMenu: false,
    
    // 从配置动态生成选择器数据，包含自定义选项
    ...(() => {
      const result = {};
      Object.entries(SELECTOR_CONFIG).forEach(([key, config]) => {
        // 加载本地存储的自定义选项
        const customOptions = AppUtils.storage(config.storageKey, undefined, 'array') || [];
        // 合并默认选项、自定义选项和"自定义..."选项（去重处理）
        const uniqueOptions = [...new Set([...config.options, ...customOptions])];
        result[`${key}Options`] = [...uniqueOptions, '自定义...'];
      });
      return result;
    })(),

    // 选择器索引和状态
    typeIndex: 0,
    locationIndex: 0,
    statusIndex: 0,
    specificationIndex: 0,
    // 选择器显示状态
    showTypePicker: false,
    showSpecificationPicker: false,
    showLocationPicker: false,
    showStatusPicker: false,
    // 当前选择器类型和标题
    currentPickerType: '',
    currentPickerTitle: '',
    currentPickerOptions: [],
    currentPickerIndex: 0,
    // 自定义输入框状态
    showCustomInput: {
      type: false,
      location: false,
      status: false,
      specification: false
    },
    customValue: '', // 临时存储自定义输入值
    currentCustomType: '', // 当前正在编辑的自定义类型
    // 输入框焦点状态
    focusName: false,
    focusQuantity: false,
    focusRemarks: false,
    focusCode: false,
    // 加载状态
    isLoading: false,
    loadingText: '',
    // 页面加载状态，用于动画
    pageLoaded: false,
    // Canvas 2D 上下文
    canvasCtx: null,
    canvas: null,
    // 操作日志相关
    showOperationLogs: false, // 控制操作日志显示
    equipmentLogs: [] // 存储当前设备的操作日志
  },

  onReady() {
    // 初始化管理器
    this.imageManager = new ImageManager(this);
    this.logManager = new OperationLogManager(this);
    
    // 初始化Canvas 2D上下文，使用2D接口
    const query = wx.createSelectorQuery()
    query.select('#imageCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        this.setData({
          canvasCtx: ctx,
          canvas: canvas
        })
      })
      
    // 监听日志更新事件
    app.globalEvent.on('logUpdated', (log) => {
      const { equipment } = this.data;
      if (equipment.id && log.equipmentId === equipment.id) {
        this.loadEquipmentLogs(equipment.id);
      }
    });
  },

  // 显示图片来源选择菜单
  showImageSourceMenu() {
    this.setData({
      showImageSourceMenu: true
    });
  },

  // 隐藏图片来源选择菜单
  hideImageSourceMenu() {
    this.setData({
      showImageSourceMenu: false
    });
  },

  // 选择图片方法 - 兼容旧的事件绑定
  chooseImage(e) {
    // 从事件数据中获取来源类型，默认为相册
    const sourceType = e.currentTarget.dataset.source || 'album';
    this.chooseImageBySource(sourceType);
  },

  // 从相机选择图片
  async chooseImageFromCamera() {
    try {
      const tempFilePath = await this.imageManager.chooseImage('camera');
      await this.imageManager.checkImageSize(tempFilePath);
      await this.imageManager.compressImage(tempFilePath);
    } catch (err) {
      console.error('相机选择图片处理失败:', err);
    }
  },

  // 从相册选择图片
  async chooseImageFromAlbum() {
    try {
      const tempFilePath = await this.imageManager.chooseImage('album');
      await this.imageManager.checkImageSize(tempFilePath);
      await this.imageManager.compressImage(tempFilePath);
    } catch (err) {
      console.error('相册选择图片处理失败:', err);
    }
  },

  // 移除已选择的图片
  async removeImage(e) {
    // 安全检查：确保事件对象存在且有stopPropagation方法
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    
    try {
      await this.imageManager.removeImage();
    } catch (err) {
      console.error('移除图片失败:', err);
    }
  },

  // 预览图片
  previewImage(e) {
    // 安全检查：确保事件对象和目标存在
    if (!e || !e.target) {
      return;
    }
    
    // 安全获取className，避免undefined错误
    const targetClass = e.target.className || '';
    
    // 检查事件源是否是移除按钮，如果是则不执行预览
    if (targetClass.includes('image-remove') || targetClass.includes('remove-icon')) {
      return;
    }
    
    const { imageTempPath } = this.data;
    this.imageManager.previewImage(imageTempPath);
  },

  // 保存器材信息
  saveEquipment() {
    const { code, name, type, location, quantity, status } = this.data.equipment;
    // 安全处理所有字段
    const safeCode = (code || '').trim();
    const safeName = (name || '').trim();
    const safeType = (type || '').trim();
    const safeLocation = (location || '').trim();
    const safeQuantity = quantity || 1;
    const safeStatus = (status || '').trim();

    // 验证必填项
    if (!safeCode) return AppUtils.showToast('请输入器材编号');
    if (!safeName) return AppUtils.showToast('请输入器材名称');
    if (!safeType) return AppUtils.showToast('请选择器材类型');
    if (!safeLocation) return AppUtils.showToast('请选择存放位置');
    if (safeQuantity < 1) return AppUtils.showToast('请输入有效数量');
    if (!safeStatus) return AppUtils.showToast('请选择状态');

    this.showLoading(this.data.equipment.id ? '更新中...' : '保存中...');
    
    // 处理图片上传
    const uploadImagePromise = this.data.imageTempPath 
      ? this.imageManager.uploadImageToCloud(this.data.imageTempPath)
      : Promise.resolve(null);
      
    uploadImagePromise
      .then(imageFileID => {
        try {
          const equipmentData = {
            ...this.data.equipment,
            code: safeCode,
            name: safeName,
            type: safeType,
            location: safeLocation,
            quantity: safeQuantity,
            status: safeStatus,
            updateTime: db.serverDate()
          };
          
          // 如果有新图片，更新图片ID
          if (imageFileID) {
            equipmentData.imageUrl = imageFileID;
          }
          
          if (!this.data.equipment.id) {
            equipmentData.id = AppUtils.generateId('eq');
            equipmentData.createTime = db.serverDate();
          }
          
          let equipmentList = app.globalData.equipmentList || AppUtils.storage('equipmentList', undefined, 'array');
          equipmentList = AppUtils.safeArray(equipmentList);

          if (this.data.equipment.id) {
            const index = equipmentList.findIndex(item => item.id === this.data.equipment.id);
            if (index !== -1) {
              equipmentList[index] = equipmentData;
            } else {
              equipmentList.unshift(equipmentData);
            }
          } else {
            equipmentList.unshift(equipmentData);
          }
          
          app.globalData.equipmentList = equipmentList;
          AppUtils.storage('equipmentList', equipmentList, 'array');
          
          // 记录操作日志
          const action = this.data.equipment.id ? '更新' : '添加';
          this.logManager.addLog(equipmentData, action);
          
          if (app.syncManager) {
            // 过滤掉系统保留字段
            const { _id, _openid, ...safeData } = equipmentData;
            
            app.syncManager.markDataChanged({
              id: equipmentData.id,
              type: this.data.equipment.id ? 'update' : 'add',
              data: safeData // 使用过滤后的数据
            });
          }
          
          this.hideLoading();
          AppUtils.showToast(this.data.equipment.id ? '更新成功' : '添加成功', 'success', 1500);
          
          setTimeout(() => {
            safeBack();
            const pages = getCurrentPages();
            const prevPage = pages[pages.length - 2];
            if (prevPage && typeof prevPage.refreshData === 'function') {
              prevPage.refreshData();
            }
          }, 1500);
          
        } catch (error) {
          this.hideLoading();
          console.error('保存失败:', error);
          AppUtils.showToast('操作失败，请重试');
        }
      })
      .catch(err => {
        this.hideLoading();
        console.error('图片上传失败:', err);
        AppUtils.showToast('图片上传失败');
      });
  },

  // 页面初始化
  onLoad(options) {
    this.setData({
      pageLoaded: true
    });
    
    if (options.id) {
      this.loadEquipmentData(options.id);
    }
  },

  // 加载器材数据
  loadEquipmentData(id) {
    if (!id) return;
    
    this.showLoading('加载中...');
    
    try {
      const targetId = String(id);
      let equipmentList = app.globalData.equipmentList || AppUtils.storage('equipmentList', undefined, 'array');
      equipmentList = AppUtils.safeArray(equipmentList);
      
      let equipment = equipmentList.find(item => String(item.id) === targetId);
      
      if (!equipment) {
        const recycleBin = app.getRecycleBin() || [];
        equipment = AppUtils.safeArray(recycleBin).find(item => String(item.id) === targetId);
      }
      
      if (equipment) {
        // 处理图片URL
        let imageUrl = equipment.imageUrl || '';
        
        // 清除包含缺失图片的URL
        const invalidImages = ['default-equipment.png'];
        if (invalidImages.some(img => imageUrl.includes(img))) {
          imageUrl = '';
        }
        
        this.setData({
          equipment: { 
            ...equipment,
            code: equipment.code || ''
          },
          imageTempPath: imageUrl
        });
        
        // 批量设置选择器索引
        Object.keys(SELECTOR_CONFIG).forEach(key => {
          this.setPickerIndex(key, equipment[SELECTOR_CONFIG[key].field]);
        });
        
        // 加载设备操作日志
        this.loadEquipmentLogs(targetId);
      } else {
        AppUtils.showToast('未找到器材信息');
        setTimeout(() => safeBack(), 1500);
      }
    } catch (error) {
      console.error('加载器材数据失败:', error);
      AppUtils.showToast('加载失败');
    } finally {
      this.hideLoading();
    }
  },
  
  // 加载设备操作日志
  loadEquipmentLogs(equipmentId) {
    if (!equipmentId) return;
    
    const logs = this.logManager.getEquipmentLogs(equipmentId);
    this.setData({
      equipmentLogs: logs
    });
  },
  
  // 切换操作日志显示状态
  toggleOperationLogs() {
    this.setData({
      showOperationLogs: !this.data.showOperationLogs
    });
  },

  // 通用选择器索引设置方法
  setPickerIndex(configKey, value) {
    const config = SELECTOR_CONFIG[configKey];
    if (!config || !value) return;
    
    const options = this.data[`${configKey}Options`];
    const index = options.indexOf(value);
    if (index !== -1) {
      this.setData({
        [`${configKey}Index`]: index
      });
    }
  },

  // 显示选择器
  showPicker(type) {
    const config = SELECTOR_CONFIG[type];
    if (!config) return;
    
    this.setData({
      [`show${type.charAt(0).toUpperCase() + type.slice(1)}Picker`]: true,
      currentPickerType: type,
      currentPickerTitle: config.title,
      currentPickerOptions: this.data[`${type}Options`],
      currentPickerIndex: this.data[`${type}Index`]
    });
  },

  // 显示各类选择器
  showTypeSelector() {
    this.showPicker('type');
  },

  showSpecificationSelector() {
    this.showPicker('specification');
  },

  showLocationSelector() {
    this.showPicker('location');
  },

  showStatusSelector() {
    this.showPicker('status');
  },

  // 隐藏选择器
  hidePicker(e) {
    const { type } = e.currentTarget.dataset;
    if (!type) return;
    
    this.setData({
      [`show${type.charAt(0).toUpperCase() + type.slice(1)}Picker`]: false
    });
  },

  // 选择器变更处理
  onPickerChange(e) {
    const { type } = e.currentTarget.dataset;
    const index = e.detail.value[0];
    this.setData({
      currentPickerIndex: index
    });
  },

  // 确认选择器选择
  confirmPickerSelection(e) {
    const { type } = e.currentTarget.dataset;
    const config = SELECTOR_CONFIG[type];
    if (!config) return;
    
    const options = this.data[`${type}Options`];
    const index = this.data.currentPickerIndex;
    const value = options[index];
    
    // 如果选择了"自定义..."选项
    if (value === '自定义...') {
      this.setData({
        currentCustomType: type,
        [`showCustomInput.${type}`]: true,
        customValue: '',
        [`show${type.charAt(0).toUpperCase() + type.slice(1)}Picker`]: false
      });
      
      // 聚焦自定义输入框
      setTimeout(() => {
        const inputId = `custom${type.charAt(0).toUpperCase() + type.slice(1)}Input`;
        const inputCtx = wx.createSelectorQuery().in(this).select(`#${inputId}`);
        
        inputCtx.fields({
          dataset: true,
          size: true
        }, function(res) {
          if (res) {
            wx.createSelectorQuery().in(this)
              .select(`#${inputId}`)
              .context(function(context) {
                if (context && context.context) {
                  context.context.focus();
                }
              })
              .exec();
          }
        }.bind(this)).exec();
      }, 300);
    } else {
      // 正常选择处理逻辑
      this.setData({
        [`${type}Index`]: index,
        [`equipment.${config.field}`]: value,
        [`show${type.charAt(0).toUpperCase() + type.slice(1)}Picker`]: false
      });
    }
  },

  // 保存自定义选项
  saveCustomOption() {
    const { currentCustomType, customValue } = this.data;
    if (!currentCustomType || !customValue.trim()) {
      AppUtils.showToast('请输入内容');
      return;
    }
    
    const config = SELECTOR_CONFIG[currentCustomType];
    if (!config) return;
    
    // 获取现有自定义选项
    let customOptions = AppUtils.storage(config.storageKey, undefined, 'array');
    
    // 去重并添加新选项
    const trimmedValue = customValue.trim();
    if (!customOptions.includes(trimmedValue)) {
      customOptions.push(trimmedValue);
      AppUtils.storage(config.storageKey, customOptions, 'array');
    }
    
    // 更新选择器选项并选择新添加的选项
    const newOptions = [
      ...config.options,
      ...customOptions,
      '自定义...'
    ];
    const uniqueNewOptions = [...new Set(newOptions)];
    const newIndex = uniqueNewOptions.indexOf(trimmedValue);
    
    this.setData({
      [`${currentCustomType}Options`]: uniqueNewOptions,
      [`${currentCustomType}Index`]: newIndex,
      [`equipment.${config.field}`]: trimmedValue,
      [`showCustomInput.${currentCustomType}`]: false,
      customValue: '',
      currentCustomType: ''
    });
    
    AppUtils.showToast('添加成功', 'success', 1000);
  },

  // 处理自定义输入
  handleCustomInput(e) {
    this.setData({
      customValue: e.detail.value
    });
  },

  // 取消自定义输入
  cancelCustomInput() {
    this.setData({
      [`showCustomInput.${this.data.currentCustomType}`]: false,
      customValue: '',
      currentCustomType: ''
    });
  },

  // 统一输入处理方法
  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`equipment.${field}`]: e.detail.value
    });
  },

  // 数量调整
  adjustQuantity(change) {
    const newQuantity = Math.max(1, this.data.equipment.quantity + change);
    this.setData({
      'equipment.quantity': newQuantity
    });
    wx.vibrateShort();
  },

  increaseQuantity() {
    this.adjustQuantity(1);
  },

  decreaseQuantity() {
    this.adjustQuantity(-1);
  },

  // 扫码获取编号
  scanCode() {
    wx.scanCode({
      success: (res) => {
        this.setData({
          'equipment.code': res.result,
          focusCode: false
        });
        AppUtils.showToast('扫码成功', 'success', 1000);
      },
      fail: (err) => {
        console.error('扫码失败:', err);
        AppUtils.showToast('扫码失败');
      }
    });
  },

  // 输入框聚焦方法
  focusNameInput() {
    this.setData({ 
      focusName: true,
      focusQuantity: false,
      focusRemarks: false,
      focusCode: false
    });
  },

  focusQuantityInput() {
    this.setData({ 
      focusQuantity: true,
      focusName: false,
      focusRemarks: false,
      focusCode: false
    });
  },

  focusRemarksInput() {
    this.setData({ 
      focusRemarks: true,
      focusName: false,
      focusQuantity: false,
      focusCode: false
    });
  },

  focusCodeInput() {
    this.setData({ 
      focusCode: true,
      focusName: false,
      focusQuantity: false,
      focusRemarks: false
    });
  },

  // 显示加载提示
  showLoading(title) {
    this.setData({
      isLoading: true,
      loadingText: title || '加载中...'
    });
  },

  // 隐藏加载提示
  hideLoading() {
    this.setData({
      isLoading: false,
      loadingText: ''
    });
  },

  // 取消操作
  cancel() {
    const hasContent = Object.values(this.data.equipment).some(
      value => value !== null && value !== undefined && value !== ''
    ) || this.data.imageTempPath;
    
    if (hasContent) {
      wx.showModal({
        title: '确认放弃',
        content: '您有未保存的内容，确定要放弃吗？',
        confirmText: '放弃',
        cancelText: '继续编辑',
        success: (res) => {
          if (res.confirm) safeBack();
        }
      });
    } else {
      safeBack();
    }
  },
  
  // 页面卸载时清理事件监听
  onUnload() {
    app.globalEvent.off('logUpdated');
  }
});
    
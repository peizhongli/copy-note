// 数据存储键名
const STORAGE_KEY = "password_scenes";

// 当前编辑的项ID
let currentEditId = null;

// 初始化
async function init() {
  await loadData();
  bindEvents();
}

// 从本地存储加载数据
async function loadData() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const scenes = data[STORAGE_KEY] || [];
  // 按置顶状态和添加时间排序
  scenes.sort((a, b) => {
    // 置顶项排在前面
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // 同为置顶或同为非置顶，按添加时间正序排列
    return a.timestamp - b.timestamp;
  });
  renderList(scenes);
}

// 保存数据到本地存储
async function saveData(scenes) {
  await chrome.storage.local.set({ [STORAGE_KEY]: scenes });
  await loadData();
}

// 渲染列表
function renderList(scenes) {
  const list = document.getElementById("list");
  list.innerHTML = "";

  if (scenes.length === 0) {
    list.innerHTML = '<p class="no-data">—— 😊暂无记录 ——</p>';
    return;
  }

  scenes.forEach((scene) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.dataset.id = scene.id;

    item.innerHTML = `
      <div class="description">
        ${scene.pinned ? '<span class="pinned-tag">🔖</span>' : ""}
        <span>${scene.description}</span>
        <span>(${scene.key})</span>
      </div>
      <div class="actions">
        <button class="btn-secondary copy-key" data-id="${scene.id}">复制键</button>
        ${scene.password ? `<button class="btn-secondary copy-password" data-id="${scene.id}">复制密码</button>` : ""}
        <button class="btn-primary top" data-id="${scene.id}">${scene.pinned ? "取消置顶" : "置顶"}</button>
        <button class="btn-secondary edit" data-id="${scene.id}">修改</button>
        <button class="btn-danger delete" data-id="${scene.id}">删除</button>
      </div>
    `;

    list.appendChild(item);
  });

  // 绑定列表项事件
  bindListEvents();
}

// 绑定表单事件
function bindEvents() {
  // 添加按钮点击事件
  document.getElementById("add-btn").addEventListener("click", () => {
    document.getElementById("add-form").classList.remove("hidden");
  });

  document.getElementById("save-btn").addEventListener("click", async () => {
    const description = document.getElementById("description").value.trim();
    const key = document.getElementById("key").value.trim();
    const password = document.getElementById("password").value;

    if (!description || !key) {
      alert("请填写主键");
      return;
    }

    const data = await chrome.storage.local.get(STORAGE_KEY);
    let scenes = data[STORAGE_KEY] || [];

    if (currentEditId) {
      // 修改现有项
      scenes = scenes.map((scene) => {
        if (scene.id === currentEditId) {
          return {
            ...scene,
            description,
            key,
            password,
          };
        }
        return scene;
      });
      currentEditId = null;
      document.getElementById("cancel-btn").style.display = "none";
    } else {
      // 添加新项
      const newScene = {
        id: Date.now().toString(),
        description,
        key,
        password,
        timestamp: Date.now(),
      };
      scenes.push(newScene);
    }

    // 清空表单并隐藏
    document.getElementById("description").value = "";
    document.getElementById("key").value = "";
    document.getElementById("password").value = "";
    document.getElementById("add-form").classList.add("hidden");
    document.getElementById("cancel-btn").style.display = "none";

    await saveData(scenes);
  });

  document.getElementById("cancel-btn").addEventListener("click", () => {
    currentEditId = null;
    document.getElementById("description").value = "";
    document.getElementById("key").value = "";
    document.getElementById("password").value = "";
    document.getElementById("cancel-btn").style.display = "none";
    document.getElementById("add-form").classList.add("hidden");
  });
}

// 绑定列表项事件
function bindListEvents() {
  // 复制键
  document.querySelectorAll(".copy-key").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      const data = await chrome.storage.local.get(STORAGE_KEY);
      const scenes = data[STORAGE_KEY] || [];
      const scene = scenes.find((s) => s.id === id);
      if (scene) {
        await navigator.clipboard.writeText(scene.key);
        // alert("主键已复制到剪贴板");
      }
    });
  });

  // 复制密码
  document.querySelectorAll(".copy-password").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      const data = await chrome.storage.local.get(STORAGE_KEY);
      const scenes = data[STORAGE_KEY] || [];
      const scene = scenes.find((s) => s.id === id);
      if (scene) {
        await navigator.clipboard.writeText(scene.password);
        // alert("密码已复制到剪贴板");
      }
    });
  });

  // 置顶/取消置顶
  document.querySelectorAll(".top").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      const data = await chrome.storage.local.get(STORAGE_KEY);
      let scenes = data[STORAGE_KEY] || [];

      // 找到要操作的项
      scenes = scenes.map((scene) => {
        if (scene.id === id) {
          return {
            ...scene,
            pinned: !scene.pinned,
          };
        }
        return scene;
      });

      await saveData(scenes);
    });
  });

  // 修改
  document.querySelectorAll(".edit").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      const data = await chrome.storage.local.get(STORAGE_KEY);
      const scenes = data[STORAGE_KEY] || [];
      const scene = scenes.find((s) => s.id === id);
      if (scene) {
        document.getElementById("add-form").classList.remove("hidden");
        document.getElementById("description").value = scene.description;
        document.getElementById("key").value = scene.key;
        document.getElementById("password").value = scene.password;
        currentEditId = id;
        document.getElementById("cancel-btn").style.display = "inline-block";
      }
    });
  });

  // 删除
  document.querySelectorAll(".delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      if (confirm("确定要删除这条记录吗？")) {
        const id = e.target.dataset.id;
        const data = await chrome.storage.local.get(STORAGE_KEY);
        let scenes = data[STORAGE_KEY] || [];
        scenes = scenes.filter((s) => s.id !== id);
        await saveData(scenes);
      }
    });
  });
}

// 初始化
init();

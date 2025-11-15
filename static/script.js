/* /static/script.js */

// 1. 当整个网页加载完毕后，运行此函数
document.addEventListener("DOMContentLoaded", function() {

    // --- 获取所有 HTML 元素的引用 ---
    const projectTypeMenu = document.getElementById("project-type");
    const projectPhaseMenu = document.getElementById("project-phase");
    const documentNameMenu = document.getElementById("document-name");
    const amountEntry = document.getElementById("amount");
    const queryButton = document.getElementById("query-button");
    const resultLabel = document.getElementById("result-level");
    // (V2.1: 移除了 canvas 和 ctx 的全局获取，移到了 draw 函数内部)
    const feedbackButton = document.getElementById("feedback-button");

    // --- 绑定事件监听 ---

    // 2. 当“项目类型”改变时
    projectTypeMenu.addEventListener("change", async function() {
        const selectedType = projectTypeMenu.value;

        // 重置后续下拉框
        documentNameMenu.disabled = true;
        documentNameMenu.innerHTML = "<option value=''>请先选择项目阶段...</option>";
        
        if (!selectedType) {
            projectPhaseMenu.disabled = true;
            projectPhaseMenu.innerHTML = "<option value=''>请先选择项目类型...</option>";
            return;
        }
        
        // 调用后端的 /api/get_phases
        try {
            const response = await fetch("/api/get_phases", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ project_type: selectedType })
            });
            const data = await response.json();
            
            if (data.success) {
                updateDropdown(projectPhaseMenu, data.phases, "请选择项目阶段...");
                projectPhaseMenu.disabled = false;
            } else {
                projectPhaseMenu.disabled = true;
                projectPhaseMenu.innerHTML = "<option value=''>加载失败</option>";
            }
        } catch (error) {
            console.error("获取项目阶段失败:", error);
            projectPhaseMenu.disabled = true;
            projectPhaseMenu.innerHTML = "<option value=''>加载出错</option>";
        }
    });

    // 3. 当“项目阶段”改变时
    projectPhaseMenu.addEventListener("change", async function() {
        const selectedType = projectTypeMenu.value;
        const selectedPhase = projectPhaseMenu.value;
        
        if (!selectedPhase) {
            documentNameMenu.disabled = true;
            documentNameMenu.innerHTML = "<option value=''>请先选择项目阶段...</option>";
            return;
        }

        // 调用后端的 /api/get_documents
        try {
            const response = await fetch("/api/get_documents", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ 
                    project_type: selectedType,
                    project_phase: selectedPhase
                })
            });
            const data = await response.json();
            
            if (data.success) {
                updateDropdown(documentNameMenu, data.documents, "请选择技术文件...");
                documentNameMenu.disabled = false;
            } else {
                documentNameMenu.disabled = true;
                documentNameMenu.innerHTML = "<option value=''>加载失败</option>";
            }
        } catch (error) {
            console.error("获取技术文件失败:", error);
            documentNameMenu.disabled = true;
            documentNameMenu.innerHTML = "<option value=''>加载出错</option>";
        }
    });

    // 4. 当“查询”按钮被点击时
    queryButton.addEventListener("click", async function() {
        // 从界面获取所有值
        const queryData = {
            project_type: projectTypeMenu.value,
            project_phase: projectPhaseMenu.value,
            document_name: documentNameMenu.value,
            amount: amountEntry.value
        };

        // 简单验证
        if (!queryData.project_type || !queryData.project_phase || !queryData.document_name) {
            alert("请完整选择所有下拉框。");
            return;
        }
        if (!queryData.amount) {
            alert("请输入合同金额。");
            return;
        }

        // 调用后端的 /api/query
        try {
            const response = await fetch("/api/query", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(queryData)
            });
            const data = await response.json();

            if (data.success) {
                // 更新定级结果
                resultLabel.textContent = data.result_level;
                // 画图
                drawFlowchartJS(data.flowchart.steps);
            } else {
                alert("查询失败: " + data.error);
                resultLabel.textContent = "查询失败";
                drawFlowchartJS(null); // 清空画布
            }
        } catch (error) {
            console.error("查询API失败:", error);
            alert("查询失败，请检查后端服务器是否运行。");
            resultLabel.textContent = "查询出错";
            drawFlowchartJS(null); // 清空画布
        }
    });

    // 5. 当“反馈”按钮被点击时
    feedbackButton.addEventListener("click", function() {
        // V23 的简单逻辑: 直接打开Google Form链接
        const feedbackUrl = "https://forms.gle/nEDWZtvmoXPkpiQr5";
        window.open(feedbackUrl, "_blank");
        // (V25的高级版：可以像V24一样弹窗，然后用JS的fetch调用 /api/submit_feedback)
    });


    // --- 辅助函数 ---

    // 帮助更新下拉框内容的函数
    function updateDropdown(selectMenu, options, defaultText) {
        selectMenu.innerHTML = ""; // 清空
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = defaultText;
        selectMenu.appendChild(defaultOption);

        if (options) {
            options.forEach(optionText => {
                const option = document.createElement("option");
                option.value = optionText;
                option.textContent = optionText;
                selectMenu.appendChild(option);
            });
        }
    }

    // 6. 在网页画布上画图的函数 (V2.1 修正版)
    function drawFlowchartJS(steps) {
        const canvas = document.getElementById("flowchart-canvas");
        if (!canvas) {
            console.error("找不到 ID 为 'flowchart-canvas' 的画布!");
            return; 
        }

        const boxWidth = 150, boxHeight = 60, vSpace = 40;
        let requiredHeight = 100; // 默认最小高度

        // 1. 先计算总高度
        if (steps && steps.length > 0) {
            requiredHeight = 40 + (steps.length * (boxHeight + vSpace));
        }

        // 2. 设置画布高度 (这会清空画布)
        canvas.height = requiredHeight;

        // 3. 在设置高度 *之后* 获取“画笔”
        const ctx = canvas.getContext("2d");

        // 4. 再次检查步骤，准备画图
        if (!steps || steps.length === 0) {
            ctx.font = "16px 'Microsoft YaHei UI'";
            ctx.fillStyle = "#D32F2F";
            ctx.textAlign = "center";
            ctx.fillText("未找到或无法绘制流程图。", canvas.width / 2, 50);
            return;
        }

        // 5. 开始画图
        const canvasWidth = canvas.width;
        const hPadding = (canvasWidth - boxWidth) / 2;
        let currentY = 40; // 绘图的起始 Y 坐标

        // 设置样式
        ctx.strokeStyle = "#0078D7"; // 边框
        ctx.lineWidth = 2;
        ctx.fillStyle = "#333333"; // 默认文字颜色
        ctx.textAlign = "center";

        steps.forEach((step, i) => {
            // (V2.1 健壮性检查: 确保 step 是一个数组)
            if (!Array.isArray(step) || step.length < 2) {
                console.error("流程图步骤数据格式错误:", step);
                return; // 跳过这个错误的步骤
            }
            
            const role = step[0];
            const action = step[1];
            const x0 = hPadding;
            const y0 = currentY;

            // 画箭头 (如果不是第一个)
            if (i > 0) {
                ctx.beginPath();
                ctx.moveTo(x0 + boxWidth / 2, y0 - vSpace);
                ctx.lineTo(x0 + boxWidth / 2, y0 - 5);
                ctx.stroke();
                // 画箭头
                ctx.beginPath();
                ctx.moveTo(x0 + boxWidth / 2 - 5, y0 - 10);
                ctx.lineTo(x0 + boxWidth / 2, y0 - 5);
                ctx.lineTo(x0 + boxWidth / 2 + 5, y0 - 10);
                ctx.stroke();
            }

            // 画矩形
            ctx.fillStyle = "#E3F2FD"; // 填充色
            ctx.fillRect(x0, y0, boxWidth, boxHeight);
            ctx.strokeRect(x0, y0, boxWidth, boxHeight);

            // 写文字
            ctx.fillStyle = "#005A9E"; // 角色文字
            ctx.font = "bold 13px 'Microsoft YaHei UI'";
            ctx.fillText(role, x0 + boxWidth / 2, y0 + 25);
            
            ctx.fillStyle = "#333333"; // 动作文字
            ctx.font = "12px 'Microsoft YaHei UI'";
            ctx.fillText(`(${action})`, x0 + boxWidth / 2, y0 + 45);

            currentY = y0 + boxHeight + vSpace;
        });
    }

}); // 确保这是文件的最后一个括号
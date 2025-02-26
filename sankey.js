let data;
let nodes;
let links;
let canvasWidth;
let canvasHeight;
const nodeWidth = 40;
const nodePadding = 50;
const linkThicknessScale = 0.5;
let hoverInfo;
let filteredData = [];
let hoveredLink = null;
let selectedNode = null;
let canvasOffsetX;
let canvasOffsetY;
const diagramWidthRatio = 1; // Use full container width
let linkInfoDiv;
let factorCorrelations = {};

// Simplified Categorical Options
const noteTakingCategories = ["Never", "Sometimes", "Always"];
const studyHoursCategories = ["<5 hours", "6-10 hours", "11-20 hours", "20+ hours"];
const readingFreqCategories = ["None", "Sometimes", "Often"];
const classAttendanceCategories = ["Sometimes", "Always"];
const cgpaCategories = ["<2.00", "2.00-2.49", "2.50-2.99", "3.00-3.49", "3.50+"];

// Color scales for better visual differentiation
const colorScales = {
    "Note-Taking": ["#cce5ff", "#99ccff", "#66b2ff"],
    "Study Hours": ["#ffcccc", "#ff9999", "#ff6666", "#ff3333"],
    "Reading Frequency": ["#ffedcc", "#ffdb99", "#ffc966"],
    "Class Attendance": ["#d2e6b5", "#b1cf86", "#AFD777"],
    "CGPA": ["#FFD0DC", "#ffc2d1", "#ffb3c6", "#ff8fab", "#fb6f92"]
};

function preload() {
    data = loadTable('Student Performance Note Taking.csv', 'csv', 'header');
}

function setup() {
    // Use the container's width and height
    const container = document.getElementById("sankey-container");
    canvasWidth = container.offsetWidth;
    canvasHeight = container.offsetHeight;

    canvasOffsetX = 0;
    canvasOffsetY = 0;

    let myCanvas = createCanvas(canvasWidth, canvasHeight);
    myCanvas.parent(container);

    hoverInfo = document.getElementById('hover-info');
    linkInfoDiv = document.getElementById('link-info');

    // Initial data processing with default filters (or none)
    const defaultFilters = {
        age: null,
        gender: null,
        scholarship: [],
        artisticSports: null,
        studyHours: [],
        readingFreqNonSci: [],
        readingFreqSci: [],
        classAttendance: []
    };
    filterData(defaultFilters);
}

function draw() {
    background(240);
    push();
    translate(canvasOffsetX, canvasOffsetY);
    drawSankeyDiagram();
    if (hoveredLink) {
        drawHoverInfo(hoveredLink);
    }
    pop();
}

function drawHoverInfo(link) {
    if (link) {
        let percentage = (link.count / filteredData.length * 100).toFixed(1);
        let content = `
            <strong>Connection:</strong> ${link.source.category} (${link.source.name}) → ${link.target.category} (${link.target.name})<br>
            <strong>Students:</strong> ${link.count} (${percentage}% of filtered data)
        `;

        hoverInfo.style.left = mouseX + 10 + 'px';
        hoverInfo.style.top = mouseY + 40 + 'px';
        hoverInfo.innerHTML = content;
        hoverInfo.style.display = 'block';
    }
}

function hideHoverInfo() {
  if (hoverInfo) {  // ADD THIS CHECK
      hoverInfo.style.display = 'none';
  }
}

window.filterData = function(selectedFilters) {
  filteredData = data.rows.filter(row => {

      let ageMatch;

      if (!selectedFilters.age){
          ageMatch = true;
      } else {
          ageMatch = selectedFilters.age.length === 0 || selectedFilters.age.includes(row.getString('Age'));
      }

      const genderMatch = !selectedFilters.gender || row.getString('Gender').toLowerCase() === selectedFilters.gender.toLowerCase();
      const scholarshipMatch = selectedFilters.scholarship.length === 0 || selectedFilters.scholarship.includes(parseInt(row.getString('Scholarship').replace('%', '')));
      const artisticSportsMatch = !selectedFilters.artisticSports || row.getString('Artistic/Sports Activity') === selectedFilters.artisticSports;
      const studyHoursMatch = selectedFilters.studyHours.length === 0 || selectedFilters.studyHours.includes(row.getString('Weekly Study Hours'));
      const readingFreqNonSciMatch = selectedFilters.readingFreqNonSci.length === 0 || selectedFilters.readingFreqNonSci.includes(row.getString('Reading frequency (non-scientific)'));
      const readingFreqSciMatch = selectedFilters.readingFreqSci.length === 0 || selectedFilters.readingFreqSci.includes(row.getString('Reading frequency (scientific)'));
      const classAttendanceMatch = selectedFilters.classAttendance.length === 0 || selectedFilters.classAttendance.includes(row.getString('Class Attendance'));

      return ageMatch && genderMatch && scholarshipMatch && artisticSportsMatch && studyHoursMatch && readingFreqNonSciMatch && readingFreqSciMatch && classAttendanceMatch;
  });

  initializeData();
  calculateFactorCorrelations();
   window.updateInsightPanel();
   draw();
}

function initializeData() {
    nodes = [];
    links = [];

    const allCategories = {
        "Note-Taking": noteTakingCategories,
        "Study Hours": studyHoursCategories,
        "Reading Frequency": readingFreqCategories,
        "Class Attendance": classAttendanceCategories,
        "CGPA": cgpaCategories,
    };

    // Create Nodes
    Object.keys(allCategories).forEach(categoryName => {
        allCategories[categoryName].forEach(nodeName => {
            nodes.push({
                name: nodeName,
                category: categoryName,
                count: 0 // will be populated when creating links
            });
        });
    });

    // Create Links (and count node occurrences)
    if (filteredData && filteredData.length > 0) {
        // Track node counts
        let nodeCounts = {};

        filteredData.forEach(row => {
            let noteTaking = row.getString('Note-taking');
            let studyHours = row.getString('Weekly Study Hours');
            let readingFrequency = row.getString('Reading frequency (non-scientific)');
            let classAttendance = row.getString('Class Attendance');
            let cgpa = row.getString('CGPA');

            // Update node counts
            const incrementNodeCount = (category, name) => {
                const nodeId = `${category}-${name}`;
                nodeCounts[nodeId] = (nodeCounts[nodeId] || 0) + 1;
            };

            incrementNodeCount("Note-Taking", noteTaking);
            incrementNodeCount("Study Hours", studyHours);
            incrementNodeCount("Reading Frequency", readingFrequency);
            incrementNodeCount("Class Attendance", classAttendance);
            incrementNodeCount("CGPA", cgpa);

            // Create an array of factors
            let factors = [
                { category: "Note-Taking", value: noteTaking },
                { category: "Study Hours", value: studyHours },
                { category: "Reading Frequency", value: readingFrequency },
                { category: "Class Attendance", value: classAttendance },
                { category: "CGPA", value: cgpa }
            ];

            // Create links between each adjacent factor
            for (let i = 0; i < factors.length - 1; i++) {
                let sourceNode = nodes.find(n => n.category === factors[i].category && n.name === factors[i].value);
                let targetNode = nodes.find(n => n.category === factors[i + 1].category && n.name === factors[i + 1].value);

                if (sourceNode && targetNode) {
                    // If link doesn't yet exist, add it
                    let existingLink = links.find(l => l.source === sourceNode && l.target === targetNode);
                    if (!existingLink) {
                        links.push({ source: sourceNode, target: targetNode, count: 1 });
                    } else {
                        // if link exists increment by 1
                        existingLink.count++;
                    }
                }
            }
        });

        // Update node counts
        nodes.forEach(node => {
            const nodeId = `${node.category}-${node.name}`;
            node.count = nodeCounts[nodeId] || 0;
        });
    }

    // Calculate Node Positions
    let nodeYPositions = {};
    Object.keys(allCategories).forEach(category => {
        nodeYPositions[category] = 0;
    });

    // Sort nodes within categories for better visualization
    const sortOrderMap = {
        "Note-Taking": ["Never", "Sometimes", "Always"],
        "Study Hours": ["<5 hours", "6-10 hours", "11-20 hours", "20+ hours"],
        "Reading Frequency": ["None", "Sometimes", "Often"],
        "Class Attendance": ["Sometimes", "Always"],
        "CGPA": ["<2.00", "2.00-2.49", "2.50-2.99", "3.00-3.49", "3.50+"]
    };

    // Group nodes by category
    let nodesByCategory = {};
    nodes.forEach(node => {
        if (!nodesByCategory[node.category]) {
            nodesByCategory[node.category] = [];
        }
        nodesByCategory[node.category].push(node);
    });

    // Sort nodes within each category
    Object.keys(nodesByCategory).forEach(category => {
        nodesByCategory[category].sort((a, b) => {
            return sortOrderMap[category].indexOf(a.name) - sortOrderMap[category].indexOf(b.name);
        });
    });

    // Assign y positions to sorted nodes
    Object.keys(nodesByCategory).forEach(category => {
        let startY = (canvasHeight - (nodesByCategory[category].length * (nodeWidth + nodePadding))) / 2;
        nodesByCategory[category].forEach((node, i) => {
            node.y = startY + i * (nodeWidth + nodePadding);
        });
    });

    // Set X positions per category
    let categoryXPositions = {
        "Note-Taking": canvasWidth * 0.08,
        "Study Hours": canvasWidth * 0.28,
        "Reading Frequency": canvasWidth * 0.48,
        "Class Attendance": canvasWidth * 0.68,
        "CGPA": canvasWidth * 0.885
    };

    nodes.forEach(node => {
        node.x = categoryXPositions[node.category];
    });

    updateLinkInfo();
}

function calculateFactorCorrelations() {
    // Reset correlations
    factorCorrelations = {
        "Note-Taking": 0,
        "Study Hours": 0,
        "Reading Frequency": 0,
        "Class Attendance": 0
    };

    // Count students with high CGPA (3.5+)
    let highCgpaCount = filteredData.filter(row => row.getString('CGPA') === "3.50+").length;

    if (highCgpaCount > 0) {
        // Calculate correlation for Note-Taking
        let alwaysTakesNotesHighCgpa = filteredData.filter(row =>
            row.getString('Note-taking') === "Always" &&
            row.getString('CGPA') === "3.50+"
        ).length;

        factorCorrelations["Note-Taking"] = alwaysTakesNotesHighCgpa / highCgpaCount;

        // Calculate correlation for Study Hours
        let highStudyHoursHighCgpa = filteredData.filter(row =>
            (row.getString('Weekly Study Hours') === "11-20 hours" ||
                row.getString('Weekly Study Hours') === "20+ hours") &&
            row.getString('CGPA') === "3.50+"
        ).length;

        factorCorrelations["Study Hours"] = highStudyHoursHighCgpa / highCgpaCount;

        // Calculate correlation for Reading Frequency
        let frequentReadingHighCgpa = filteredData.filter(row =>
            row.getString('Reading frequency (non-scientific)') === "Often" &&
            row.getString('CGPA') === "3.50+"
        ).length;

        factorCorrelations["Reading Frequency"] = frequentReadingHighCgpa / highCgpaCount;

        // Calculate correlation for Class Attendance
        let highAttendanceHighCgpa = filteredData.filter(row =>
            row.getString('Class Attendance') === "Always" &&
            row.getString('CGPA') === "3.50+"
        ).length;

        factorCorrelations["Class Attendance"] = highAttendanceHighCgpa / highCgpaCount;
    }
}

window.updateInsightPanel = function() {
    let insightPanel = document.getElementById('insight-panel');
    if (!insightPanel) return;

    let studentCount = filteredData.length;
    let highCgpaCount = filteredData.filter(row => row.getString('CGPA') === "3.50+").length;
    let highCgpaPercentage = studentCount > 0 ? (highCgpaCount / studentCount * 100).toFixed(1) : 0;

    // Sort factors by correlation strength
    let sortedFactors = Object.keys(factorCorrelations)
        .filter(factor => factorCorrelations[factor] > 0)
        .sort((a, b) => factorCorrelations[b] - factorCorrelations[a]);

    // Primary Insight: The "quote area"
    let primaryInsight = '';
    let strongestFactor = sortedFactors.length > 0 ? sortedFactors[0] : "No factors";
    let strongestPercentage = factorCorrelations[strongestFactor] * 100 || 0;

    primaryInsight = `
        Based on the current filters, <span class="comparison-text">${strongestFactor}</span> 
        shows the strongest correlation with high academic performance (${strongestPercentage.toFixed(1)}% of students 
        with excellent ${strongestFactor.toLowerCase()} achieve 3.5+ GPA).
    `;

    // Factor Impact Bars
    let factorImpactBars = '';
    if (sortedFactors.length > 0) {
        factorImpactBars = `
            <h3>Factor Impact on High GPA (3.5+)</h3>
            <div id="factor-impact-container">`;

        sortedFactors.forEach(factor => {
            let percentage = (factorCorrelations[factor] * 100).toFixed(1);
            factorImpactBars += `
                <div class="factor-strength">
                    <div class="factor-name">${factor}</div>
                    <div class="factor-bar-container">
                        <div class="factor-bar" style="width: ${percentage}%"></div>
                    </div>
                    <div class="factor-value">${percentage}%</div>
                </div>`;
        });

        factorImpactBars += `</div>`;
    }


    let content = `
        <h2>Key Insights</h2>
        <div id="primary-insight" class="key-insight">
            ${primaryInsight}
        </div>
        <h3>Current Selection</h3>
        <p><strong>Students:</strong> ${studentCount}</p>
        <p><strong>High CGPA Students (3.5+):</strong> ${highCgpaCount} (${highCgpaPercentage}%)</p>
        ${factorImpactBars}
    `;

    insightPanel.innerHTML = content;
}

function updateLinkInfo() {
    if (!linkInfoDiv) return;

    let content = '<h3>Study Habit Patterns</h3>';

    if (selectedNode) {
        let nodeLinks = links.filter(link => link.source === selectedNode || link.target === selectedNode);

        if (nodeLinks.length > 0) {
            content += `<h4>${selectedNode.category}: ${selectedNode.name}</h4><ul>`;

            // Sort links by count
            nodeLinks.sort((a, b) => b.count - a.count);

            nodeLinks.forEach(link => {
                let relationNode = link.source === selectedNode ? link.target : link.source;
                let direction = link.source === selectedNode ? link.target : link.source;
                let percentage = (link.count / selectedNode.count * 100).toFixed(1);

                content += `<li><strong>${relationNode.category} ${direction} ${relationNode.name}:</strong> ${link.count} students (${percentage}%)</li>`;
            });

            content += '</ul>';
        } else {
            content += `<p>No connections found for ${selectedNode.category}: ${selectedNode.name}</p>`;
        }
    } else {
        // Show most common study patterns overall
        let topPatterns = [...links].sort((a, b) => b.count - a.count).slice(0, 5);

        if (topPatterns.length > 0) {
            content += '<h4>Top Study Patterns:</h4><ul>';

            topPatterns.forEach(link => {
                let percentage = (link.count / filteredData.length * 100).toFixed(1);
                content += `<li><strong>${link.source.category} (${link.source.name}) → ${link.target.category} (${link.target.name}):</strong> ${link.count} students (${percentage}%)</li>`;
            });

            content += '</ul>';
        } else {
            content += '<p>No patterns found in current selection.</p>';
        }
    }

    linkInfoDiv.innerHTML = content;
}

const sankeyVerticalOffset = 20;

function drawSankeyDiagram() {
    if (!nodes || nodes.length === 0 || !links || links.length === 0) {
        textSize(20);
        textAlign(CENTER, CENTER);
        fill(100);
        text("No data to display based on current filters.", canvasWidth / 2, canvasHeight / 2 + sankeyVerticalOffset);
        return;
    }
  
    // Draw category labels
    textSize(16);
    textStyle(BOLD);
    textAlign(CENTER);
    fill(0);
  
    let categoryXPositions = {
        "Note-Taking": canvasWidth * 0.1,
        "Study Hours": canvasWidth * 0.3,
        "Reading Frequency": canvasWidth * 0.5,
        "Class Attendance": canvasWidth * 0.7,
        "CGPA": canvasWidth * 0.9
    };
  
    Object.keys(categoryXPositions).forEach(category => {
        text(category, categoryXPositions[category], 50); 
    });
  
    // First pass: calculate node heights based on student count
    calculateNodeHeights();
    
    // Second pass: position nodes vertically based on predefined category order
    positionNodesVertically();
    
    // Third pass: calculate entry and exit positions for links
    calculateLinkPositions();
  
    // Draw links
    noStroke();
  
    // Sort links by count (descending) to draw thicker ones first
    let sortedLinks = [...links].sort((a, b) => b.count - a.count);
  
    sortedLinks.forEach(link => {
        // Link thickness is now based on the actual count value
        let linkThickness = Math.max(2, link.count * 3); // Apply minimum thickness for visibility
        
        // Use the precalculated source and target positions
        let sourceX = link.source.x + nodeWidth;
        let sourceY = link.sourceY + sankeyVerticalOffset;
        let targetX = link.target.x;
        let targetY = link.targetY + sankeyVerticalOffset;
  
        // Calculate control points for curved links
        let control1X = sourceX + (targetX - sourceX) * 0.4;
        let control1Y = sourceY;
        let control2X = sourceX + (targetX - sourceX) * 0.6;
        let control2Y = targetY;
  
        // Get color based on source node category
        let sourceCategory = link.source.category;
        let sourceIndex = noteTakingCategories.indexOf(link.source.name);
  
        if (sourceCategory === "Study Hours") {
            sourceIndex = studyHoursCategories.indexOf(link.source.name);
        } else if (sourceCategory === "Reading Frequency") {
            sourceIndex = readingFreqCategories.indexOf(link.source.name);
        } else if (sourceCategory === "Class Attendance") {
            sourceIndex = classAttendanceCategories.indexOf(link.source.name);
        } else if (sourceCategory === "CGPA") {
            sourceIndex = cgpaCategories.indexOf(link.source.name);
        }
  
        let linkColor = colorScales[sourceCategory][sourceIndex] || "#cccccc";
  
        // Highlight the link if it's hovered
        if (link === hoveredLink) {
            fill(255, 255, 0, 200); // Highlighted color
        } else if (selectedNode && (link.source === selectedNode || link.target === selectedNode)) {
            fill(190, 147, 212, 150); // Lilac for selected node connections
        } else {
            fill(linkColor);
        }
  
        // Draw bezier curve for link
        beginShape();
        vertex(sourceX, sourceY - linkThickness / 2);
        bezierVertex(control1X, sourceY - linkThickness / 2, control2X, targetY - linkThickness / 2, targetX, targetY - linkThickness / 2);
        vertex(targetX, targetY + linkThickness / 2);
        bezierVertex(control2X, targetY + linkThickness / 2, control1X, sourceY + linkThickness / 2, sourceX, sourceY + linkThickness / 2);
        endShape(CLOSE);
    });
  
    // Draw nodes
    if (nodes && Array.isArray(nodes)) {
        nodes.forEach(node => {
            if (node.count === 0) return; // Skip empty nodes
        
            let categoryIndex = 0;
        
            if (node.category === "Note-Taking") {
                categoryIndex = noteTakingCategories.indexOf(node.name);
            } else if (node.category === "Study Hours") {
                categoryIndex = studyHoursCategories.indexOf(node.name);
            } else if (node.category === "Reading Frequency") {
                categoryIndex = readingFreqCategories.indexOf(node.name);
            } else if (node.category === "Class Attendance") {
                categoryIndex = classAttendanceCategories.indexOf(node.name);
            } else if (node.category === "CGPA") {
                categoryIndex = cgpaCategories.indexOf(node.name);
            }
        
            // Highlight selected node
            let nodeColor = colorScales[node.category][categoryIndex] || "#cccccc";
            if (node === selectedNode) {
                fill(190, 147, 212, 150);  //Change fill to periwinkle when selected
                stroke('#BE93D4');
                strokeWeight(3);
            } else {
                fill(nodeColor); // Use the node's color instead of white
                noStroke();
            }

        
            // Draw the node with the calculated height
            rect(node.x, node.y + sankeyVerticalOffset, nodeWidth, node.height, 7);
        
            // Node label
            noStroke();
            // Set text color based on background color brightness for better readability
            fill(0); // Use white text on light backgrounds, white on dark
            textSize(14);
            textAlign(CENTER, CENTER);
        
            // Show number of students
            let label = node.name;
            if (node.category === "Study Hours") {
                label = label.replace(" hours", "h");
            }
            text(label, node.x + nodeWidth / 2, node.y + node.height / 2 - 7 + sankeyVerticalOffset);
            text(`(${node.count})`, node.x + nodeWidth / 2, node.y + node.height / 2 + 7 + sankeyVerticalOffset);
        });
    }
}
  
  // New function to calculate node heights based on counts
  function calculateNodeHeights() {
    const maxHeight = canvasHeight * 0.6; // Maximum height for nodes
    
    // Find max count to scale heights
    let maxCount = 0;
    if (nodes && Array.isArray(nodes)) {
        nodes.forEach(node => {
            if (node.count > maxCount) {
                maxCount = node.count;
            }
        });
    
        // Calculate height for each node
        nodes.forEach(node => {
            // Scale height based on count, with minimum size for visibility
            node.height = Math.max(nodeWidth, (node.count / maxCount) * maxHeight);
        });
    }
  }
  
  // Updated function to position nodes vertically according to predefined order
function positionNodesVertically() {
    const categoryOrders = {
        "Note-Taking": ["Never", "Sometimes", "Always"],
        "Study Hours": ["<5 hours", "6-10 hours", "11-20 hours", "20+ hours"],
        "Reading Frequency": ["None", "Sometimes", "Often"],
        "Class Attendance": ["Sometimes", "Always"],
        "CGPA": ["<2.00", "2.00-2.49", "2.50-2.99", "3.00-3.49", "3.50+"]
    };

    const availableHeight = canvasHeight * 0.7;
    const spacing = 20;  //increased spacing

    // Group nodes by category
    const nodesByCategory = {};
    if (nodes && Array.isArray(nodes)) {
        nodes.forEach(node => {
            if (!nodesByCategory[node.category]) {
                nodesByCategory[node.category] = [];
            }
            nodesByCategory[node.category].push(node);
        });

        // Iterate through each category
        Object.keys(nodesByCategory).forEach(category => {
            const orderArray = categoryOrders[category];

            if (!orderArray) {
                console.error(`No ordering defined for category: ${category}`);
                return;
            }

            const nodeMap = {};
            nodesByCategory[category].forEach(node => {
                nodeMap[node.name] = node;
            });


            const categoryNodeCount = nodesByCategory[category].length;

            let totalNodeHeight = 0;

            nodesByCategory[category].forEach(node => {
                totalNodeHeight += node.height;
            });

            let totalSpacing = (categoryNodeCount - 1) * spacing;
            let startY = (canvasHeight - totalNodeHeight - totalSpacing) / 2;
            // Position nodes according to the order in categoryOrders
            let yPos = startY;
            orderArray.forEach(nodeName => {
                const node = nodeMap[nodeName];

                if (node) {
                    node.y = yPos;

                    yPos += node.height + spacing;
                }
            });
        });
    }
}
  
  function calculateLinkPositions() {
    // Assign unique IDs to nodes if they don't have them
    if (nodes && Array.isArray(nodes)) {
        nodes.forEach((node, index) => {
            if (!node.id) {
                node.id = `${node.category}-${node.name}`;
            }
        });
    }
    
    // Group links by source node and target node
    let linksBySource = {};
    let linksByTarget = {};
    
    if (nodes && Array.isArray(nodes)) {
        nodes.forEach(node => {
            linksBySource[node.id] = [];
            linksByTarget[node.id] = [];
        });
    }
    
    if (links && Array.isArray(links)) {
        links.forEach(link => {
            linksBySource[link.source.id].push(link);
            linksByTarget[link.target.id].push(link);
        });
    }
    
    // Calculate source positions
    if (nodes && Array.isArray(nodes)) {
        nodes.forEach(sourceNode => {
            const sourceLinks = linksBySource[sourceNode.id];
            if (!sourceLinks || sourceLinks.length === 0) return;
        
            // Calculate total value flowing out of this node
            const totalValue = sourceLinks.reduce((sum, link) => sum + link.count, 0);
        
            // Assign positions proportionally within the node's height
            let currentY = sourceNode.y;
        
            sourceLinks.forEach(link => {
                const ratio = link.count / totalValue;
                const linkHeight = sourceNode.height * ratio;
            
                // Position at the center of this link's section
                link.sourceY = currentY + linkHeight / 2;
            
                // Move down for next link
                currentY += linkHeight;
            });
        });
    }
    
    // Calculate target positions
    if (nodes && Array.isArray(nodes)) {
        nodes.forEach(targetNode => {
            const targetLinks = linksByTarget[targetNode.id];
            if (!targetLinks || targetLinks.length === 0) return;
        
            // Calculate total value flowing into this node
            const totalValue = targetLinks.reduce((sum, link) => sum + link.count, 0);
        
            // Assign positions proportionally within the node's height
            let currentY = targetNode.y;
        
            targetLinks.forEach(link => {
                const ratio = link.count / totalValue;
                const linkHeight = targetNode.height * ratio;
            
                // Position at the center of this link's section
                link.targetY = currentY + linkHeight / 2;
            
                // Move down for next link
                currentY += linkHeight;
            });
        });
    }
  }
  
  // Update mouseMoved function to use the new link positions
  function mouseMoved() {
    // Check if mouse is inside the canvas
    if (mouseX < 0 || mouseY < 0 || mouseX > canvasWidth || mouseY > canvasHeight) {
        hoveredLink = null;
        hideHoverInfo();
        return;
    }
  
    const mx = mouseX - canvasOffsetX;
    const my = mouseY - canvasOffsetY;
  
    // Check for hovering over links
    hoveredLink = null;
    if (links && Array.isArray(links)) {
        for (let link of links) {
            // Get source and target positions
            let sourceX = link.source.x + nodeWidth;
            let sourceY = link.sourceY + sankeyVerticalOffset;
            let targetX = link.target.x;
            let targetY = link.targetY + sankeyVerticalOffset;
  
            // Calculate control points
            let control1X = sourceX + (targetX - sourceX) * 0.4;
            let control1Y = sourceY;
            let control2X = sourceX + (targetX - sourceX) * 0.6;
            let control2Y = targetY;

            // Check if mouse is roughly along the path
            let linkThickness = Math.max(10, link.count * 2);
            let isHovering = false;
            const numSamples = 10; // Increase for better accuracy

            for (let i = 0; i <= numSamples; i++) {
                let t = i / numSamples;
                let pointOnCurveX = bezierPoint(sourceX, control1X, control2X, targetX, t);
                let pointOnCurveY = bezierPoint(sourceY, control1Y, control2Y, targetY, t);

                let distance = dist(mx, my, pointOnCurveX, pointOnCurveY);

                if (distance < linkThickness / 2) { // Divide by 2 because we are checking distance from center
                    isHovering = true;
                    break;
                }
            }

            if (isHovering) {
                hoveredLink = link;
                break;
            }
        }
    }
  
    // Check for hovering over nodes
    selectedNode = null;
    if (nodes && Array.isArray(nodes)) {
        for (let node of nodes) {
            if (mx >= node.x && mx <= node.x + nodeWidth &&
                my >= node.y + sankeyVerticalOffset && my <= node.y + node.height + sankeyVerticalOffset) {
                selectedNode = node;
                break;
            }
        }
    }
  
    if (hoveredLink) {
        drawHoverInfo(hoveredLink);
    } else {
        hideHoverInfo();
    }
  }

function mouseClicked() {
  const mx = mouseX - canvasOffsetX;
  const my = mouseY - canvasOffsetY;

  // Check if clicked on a node
  let clickedNode = null;

  if (nodes && Array.isArray(nodes)) {  // ADD THIS CHECK
      for (let node of nodes) {
          if (mx > node.x && mx < node.x + nodeWidth &&
              my > node.y && my < node.y + nodeWidth) {
              clickedNode = node;
              break;
          }
      }
  }

  if (clickedNode) {
      if (selectedNode === clickedNode) {
          // Deselect if clicking the same node
          selectedNode = null;
      } else {
          selectedNode = clickedNode;
      }
      updateLinkInfo();
  }
}
function windowResized() {
    const container = document.getElementById("sankey-container");
    canvasWidth = container.offsetWidth;
    canvasHeight = container.offsetHeight;
    resizeCanvas(canvasWidth, canvasHeight);

    // Re-initialize data to update positions
    initializeData();
    draw();
}
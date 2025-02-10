let data;
let nodes;
let links;
let canvasWidth;
let canvasHeight;
let nodeWidth = 20;
let nodePadding = 50;
let linkThickness = 12;
let hoverInfo;
let filteredData = [];
let hoveredLink = null;
let selectedNode = null;
let canvasOffsetX;
let canvasOffsetY;
let diagramWidthRatio = 0.8; // Ratio of canvas used by the diagram
let linkInfoDiv;

function preload() {
    data = loadTable('Student Performance Note Taking.csv', 'csv', 'header');
}

function setup() {
    canvasWidth = windowWidth * diagramWidthRatio; // Use ratio of canvas width
    canvasHeight = windowHeight * diagramWidthRatio; // Use ratio of canvas height

    // Calculate offsets to center the canvas
   canvasOffsetX = 0;
  canvasOffsetY = 0;

  // CREATE CANVAS INSIDE sankey-container

    let container = document.getElementById("sankey-container");

    let myCanvas = createCanvas(canvasWidth, canvasHeight);
    myCanvas.parent(container);

  //let canvasElement = document.querySelector("canvas");
  //canvasElement.style.position = "relative";
  //canvasElement.style.left = canvasOffsetX + "px";
  //canvasElement.style.top = canvasOffsetY + "px";


    hoverInfo = document.getElementById('hover-info');
    linkInfoDiv = document.getElementById('link-info');
    setupFilterListeners();
    filterData();
}


function draw() {
  background(240);
  push(); // Save current drawing settings
   translate(canvasOffsetX, canvasOffsetY);
  drawSankeyDiagram();
  if (hoveredLink) {
      drawHoverInfo(hoveredLink);
  }
   pop();
}

function drawHoverInfo(link) {
  if (link) {
        let percentage = (link.value / filteredData.length * 100).toFixed(1);
        let content = `Link Value: ${link.value} (${percentage}%)`;

        hoverInfo.style.left = mouseX + 'px';
        hoverInfo.style.top = mouseY + 'px';
        hoverInfo.innerHTML = content;
  }
}

function hideHoverInfo() {
    hoverInfo.style.display = 'none';
}

function setupFilterListeners() {
   document.querySelectorAll('#filter-panel input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', filterData);
    });
}

function filterData() {
  let ageFilters = Array.from(document.querySelectorAll('#filter-panel input[id^="age-filter-"]:checked')).map(cb => cb.value);
  let genderFilters = Array.from(document.querySelectorAll('#filter-panel input[id^="gender-filter-"]:checked')).map(cb => cb.value);
  let scholarshipFilters = Array.from(document.querySelectorAll('#filter-panel input[id^="scholarship-filter-"]:checked')).map(cb => parseInt(cb.value));
  let additionalWorkFilters = Array.from(document.querySelectorAll('#filter-panel input[id^="additional-work-filter-"]:checked')).map(cb => cb.value);
  let artisticSportsFilters = Array.from(document.querySelectorAll('#filter-panel input[id^="artistic-sports-filter-"]:checked')).map(cb => cb.value);
  let studyHoursFilters = Array.from(document.querySelectorAll('#filter-panel input[id^="study-hours-filter-"]:checked')).map(cb => cb.value);
  let readingNonSciFilters = Array.from(document.querySelectorAll('#filter-panel input[id^="reading-freq-non-sci-filter-"]:checked')).map(cb => cb.value);
  let readingSciFilters = Array.from(document.querySelectorAll('#filter-panel input[id^="reading-freq-sci-filter-"]:checked')).map(cb => cb.value);
  let classAttendanceFilters = Array.from(document.querySelectorAll('#filter-panel input[id^="class-attendance-filter-"]:checked')).map(cb => cb.value);



  filteredData = data.rows.filter(row => {
    let ageMatch = ageFilters.length === 0 || ageFilters.includes(row.getString('Age'));
    let genderMatch = genderFilters.length === 0 || genderFilters.includes(row.getString('Gender'));
    let scholarshipMatch = scholarshipFilters.length === 0 || scholarshipFilters.includes(parseInt(row.getString('Scholarship').replace('%','')));
    let additionalWorkMatch = additionalWorkFilters.length === 0 || additionalWorkFilters.includes(row.getString('Additional Work'));
    let artisticSportsMatch = artisticSportsFilters.length === 0 || artisticSportsFilters.includes(row.getString('Artistic/Sports Activity'));
    let studyHoursMatch = studyHoursFilters.length === 0 || studyHoursFilters.includes(row.getString('Weekly Study Hours').split('-')[0]) || studyHoursFilters.includes(row.getString('Weekly Study Hours'));
    let readingNonSciMatch = readingNonSciFilters.length === 0 || readingNonSciFilters.includes(row.getString('Reading frequency (non-scientific)'));
      let readingSciMatch = readingSciFilters.length === 0 || readingSciFilters.includes(row.getString('Reading frequency (scientific)'));
    let classAttendanceMatch = classAttendanceFilters.length === 0 || classAttendanceFilters.includes(row.getString('Class Attendance'));

        return ageMatch && genderMatch && scholarshipMatch && additionalWorkMatch && artisticSportsMatch && studyHoursMatch && readingNonSciMatch && readingSciMatch && classAttendanceMatch;
    });
    initializeData();
}


function initializeData() {
      // Define node categories
    nodes = [
      { name: "Never", category: "Note-Taking"},
      { name: "Sometimes", category: "Note-Taking"},
      { name: "Always", category: "Note-Taking"},
      { name: "male", category: "Gender"},
      { name: "female", category: "Gender"},
      { name: "<2.00", category: "CGPA"},
      { name: "2.00-2.49", category: "CGPA"},
      { name: "2.50-2.99", category: "CGPA"},
      { name: "3.00-3.49", category: "CGPA"},
      { name: "3.50+", category: "CGPA"}
    ];
    
      // Calculate link frequencies
    let linkCounts = {};
  if (filteredData && filteredData.length > 0){ //check if filteredData is not empty or undefined
    for (let row of filteredData) {
        let source = row.getString('Note-taking');
        let gender = row.getString('Gender');
        let target = row.getString('CGPA');

        if (source && gender && target){
            let link_1 = source + '-' + gender;
            let link_2 = gender + '-' + target;
            linkCounts[link_1] = (linkCounts[link_1] || 0) + 1;
            linkCounts[link_2] = (linkCounts[link_2] || 0) + 1;
        }
    }
        // Create link array
      links = [];

      for (let row of filteredData){
          let source = row.getString('Note-taking');
          let gender = row.getString('Gender');
          let target = row.getString('CGPA');
    
          if (source && gender && target) {
            let link_1 = source + '-' + gender;
            let link_2 = gender + '-' + target;
          
            let sourceNode_1 = nodes.find(node => node.name == source);
            let targetNode_1 = nodes.find(node => node.name == gender);
            let value_1 = linkCounts[link_1];
          
            let sourceNode_2 = nodes.find(node => node.name == gender);
            let targetNode_2 = nodes.find(node => node.name == target);
            let value_2 = linkCounts[link_2];
          
            links.push({ source: sourceNode_1, target: targetNode_1, value: value_1});
            links.push({ source: sourceNode_2, target: targetNode_2, value: value_2});
          }
      }
    }
    else {
        links = []; // set to empty array if filteredData is not available
    }

    // Calculate Node Positions
    let nodeYPositions = {};
    nodes.forEach(node => {
        nodeYPositions[node.category] = nodeYPositions[node.category] || 0;
        node.y = nodeYPositions[node.category];
        nodeYPositions[node.category] += nodeWidth + nodePadding;
    })
     nodes.forEach(node => {
       if (node.category == "Note-Taking"){
        node.x = (canvasWidth / 4) - 100; // fixed x coordinate for Note-Taking node
      }
        else if (node.category == "Gender"){
          node.x = (canvasWidth / 2) - 100; // fixed x coordinate for Gender node
        }
      else if (node.category == "CGPA"){
          node.x = (canvasWidth / 4 * 3) - 100; // fixed x coordinate for CGPA node
        }
    });
        updateLinkInfo();
}


function drawSankeyDiagram() {
  hoveredLink = null; // reset the hovered link
    linkInfoDiv.innerHTML = ''; // Clear previous link info
    
    // Draw Links
   for (let link of links) {
    if (link.source && link.target) { // check for null objects
      let startX = link.source.x + nodeWidth;
      let startY = link.source.y + nodeWidth / 2;
      let endX = link.target.x;
      let endY = link.target.y + nodeWidth / 2;
    
      let linkColor = color(150, 150, 250, 100); // Light transparent purple
          //check for highlight based on node selection
        if (selectedNode) {
            if (link.source === selectedNode || link.target === selectedNode) {
                linkColor = color(150, 150, 250, 255);
            } else {
                  linkColor = color(150, 150, 250, 50); // Make other links transparent
            }
        }

          // check for hover
        if(isMouseOverLink(startX,startY,endX, endY)){
          linkColor = color(150, 150, 250, 255);
          hoveredLink = link;
          cursor(HAND);
          updateLinkInfo(link);
        } else {
          cursor(ARROW);
        }

        stroke(linkColor);
        strokeWeight(linkThickness);
      line(startX, startY, endX, endY);
    }
  }

    // Draw Nodes
    for (let node of nodes) {
      let nodeColor = (selectedNode === node) ? color(150, 150, 250) : color(200, 200, 200);
        fill(nodeColor);
        noStroke();
      rect(node.x, node.y, nodeWidth, nodeWidth);

      // Add Text Label
        fill(0); // black
      textSize(12);
        textAlign(LEFT, CENTER);
      text(node.name, node.x + nodeWidth + 5, node.y + nodeWidth / 2);
      //add mouse event listener for nodes
       if (isMouseOverNode(node.x, node.y)){
          cursor(HAND);
       } else {
         cursor(ARROW);
        }
    }
}

function isMouseOverLink(startX, startY, endX, endY) {
    let d = dist(mouseX - canvasOffsetX, mouseY - canvasOffsetY, startX, startY);
    let totalLength = dist(startX, startY, endX, endY);
    let A = endY - startY;
    let B = startX - endX;
    let C = endX * startY - startX * endY;
    let distFromLine = abs(A * (mouseX - canvasOffsetX) + B * (mouseY - canvasOffsetY) + C) / sqrt(A * A + B * B);
    return distFromLine < linkThickness && d < totalLength ;
}

function isMouseOverNode(nodeX, nodeY){
    return mouseX - canvasOffsetX >= nodeX && mouseX - canvasOffsetX <= nodeX + nodeWidth &&
           mouseY - canvasOffsetY >= nodeY && mouseY - canvasOffsetY <= nodeY + nodeWidth;
}

function mouseClicked(){
    for (let node of nodes){
        if(isMouseOverNode(node.x, node.y)){
            selectedNode = (selectedNode === node) ? null : node; // Toggle selection
             drawSankeyDiagram();
        }
    }
}

function updateLinkInfo(link = null) {

      if (link)
          {
          let percentage = (link.value / filteredData.length * 100).toFixed(1);
                if (link.source.category === "Note-Taking" && link.target.category === "Gender")
              {
               linkInfoDiv.innerHTML = `Percentage of students that take ${link.source.name} notes that are ${link.target.name}: ${percentage}%`;
                }
                else if (link.source.category === "Gender" && link.target.category === "CGPA"){
                    linkInfoDiv.innerHTML = `Percentage of ${link.source.name} students that have a CGPA of ${link.target.name}: ${percentage}%`;
                }
         }
        else {
      linkInfoDiv.innerHTML = "No links hovered.";
    }
}

function windowResized() {
    canvasWidth = windowWidth * diagramWidthRatio; // Use ratio of canvas width
    canvasHeight = windowHeight* diagramWidthRatio; // Use ratio of canvas height

    // Calculate offsets to center the canvas
    canvasOffsetX = (windowWidth - canvasWidth) / 2;
    canvasOffsetY = (windowHeight - canvasHeight) /2;

    resizeCanvas(canvasWidth, canvasHeight);
   let canvasElement = document.querySelector("canvas");
  canvasElement.style.position = "relative";
  canvasElement.style.left = canvasOffsetX + "px";
   canvasElement.style.top = canvasOffsetY + "px";
}
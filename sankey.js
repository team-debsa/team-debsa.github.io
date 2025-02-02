let data;
let nodes;
let links;
let canvasWidth;
let canvasHeight;
let nodeWidth = 30;
let nodePadding = 10;
let linkThickness = 10;
let hoverInfo;
let filteredData = [];
let hoveredLink = null;
let selectedNode = null;
let scholarshipSlider;
let studyHoursSlider;


function preload() {
    data = loadTable('Student Performance Note Taking.csv', 'csv', 'header');
}

function setup() {
    canvasWidth = windowWidth - 300;
    canvasHeight = windowHeight;
    createCanvas(canvasWidth, canvasHeight);
    hoverInfo = document.getElementById('hover-info');
    scholarshipSlider = document.getElementById('scholarship-slider');
    studyHoursSlider = document.getElementById('study-hours-slider');
    setupFilterListeners();
    filterData();
}

function draw() {
    background(240);
    drawSankeyDiagram();
    if (hoveredLink) {
        drawHoverInfo(hoveredLink);
    }
}

function drawHoverInfo(link) {
  if (link) {
        let percentage = (link.value / filteredData.length * 100).toFixed(1);
        let content = `Link Value: ${link.value} (${percentage}%)`;
      
        hoverInfo.style.display = 'block';
      hoverInfo.style.left = mouseX + 10 + 'px';
      hoverInfo.style.top = mouseY + 10 + 'px';
      hoverInfo.innerHTML = content;
  }
}

function hideHoverInfo() {
    hoverInfo.style.display = 'none';
}

function setupFilterListeners() {
    document.getElementById('age-filter').addEventListener('change', filterData);
    document.getElementById('gender-filter').addEventListener('change', filterData);
    scholarshipSlider.addEventListener('input', filterData);
    document.getElementById('additional-work-filter').addEventListener('change', filterData);
    document.getElementById('artistic-sports-filter').addEventListener('change', filterData);
    studyHoursSlider.addEventListener('input', filterData);
    document.getElementById('reading-freq-non-sci-filter').addEventListener('change', filterData);
    document.getElementById('reading-freq-sci-filter').addEventListener('change', filterData);
    document.getElementById('class-attendance-filter').addEventListener('change', filterData);
}

function filterData() {
  let ageFilter = document.getElementById('age-filter').value;
  let genderFilter = document.getElementById('gender-filter').value;
  let scholarshipValue = parseInt(scholarshipSlider.value);
  let additionalWorkFilter = document.getElementById('additional-work-filter').value;
  let artisticSportsFilter = document.getElementById('artistic-sports-filter').value;
  let studyHoursValue = parseInt(studyHoursSlider.value);
  let readingNonSciFilter = document.getElementById('reading-freq-non-sci-filter').value;
  let readingSciFilter = document.getElementById('reading-freq-sci-filter').value;
  let classAttendanceFilter = document.getElementById('class-attendance-filter').value;

  filteredData = data.rows.filter(row => {
      let ageMatch = ageFilter === 'all' || row.getString('Age') === ageFilter;
      let genderMatch = genderFilter === 'all' || row.getString('Gender') === genderFilter;
      let scholarshipMatch = scholarshipValue === 100 || (parseInt(row.getString('Scholarship').replace('%', '')) <= scholarshipValue);
      let additionalWorkMatch = additionalWorkFilter === 'all' || row.getString('Additional Work') === additionalWorkFilter;
      let artisticSportsMatch = artisticSportsFilter === 'all' || row.getString('Artistic/Sports Activity') === artisticSportsFilter;
      let studyHoursMatch = studyHoursValue === 20 || (parseInt(row.getString('Weekly Study Hours').split('-')[0]) <= studyHoursValue);
      let readingNonSciMatch = readingNonSciFilter === 'all' || row.getString('Reading frequency (non-scientific)') === readingNonSciFilter;
      let readingSciMatch = readingSciFilter === 'all' || row.getString('Reading frequency (scientific)') === readingSciFilter;
      let classAttendanceMatch = classAttendanceFilter === 'all' || row.getString('Class Attendance') === classAttendanceFilter;

      return ageMatch && genderMatch && scholarshipMatch && additionalWorkMatch && artisticSportsMatch && studyHoursMatch && readingNonSciMatch && readingSciMatch && classAttendanceMatch;
  });

    updateSliderLabels();
    initializeData();
}


function updateSliderLabels(){
  document.getElementById('scholarship-min-value').innerText = `0%` ;
  document.getElementById('scholarship-max-value').innerText = `${scholarshipSlider.value}%`;
   document.getElementById('study-hours-min-value').innerText = `0 hours` ;
  document.getElementById('study-hours-max-value').innerText = `${studyHoursSlider.value}+ hours`;
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
}


function drawSankeyDiagram() {
  hoveredLink = null; // reset the hovered link
  
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
    let d = dist(mouseX, mouseY, startX, startY);
    let totalLength = dist(startX, startY, endX, endY);
    let A = endY - startY;
    let B = startX - endX;
    let C = endX * startY - startX * endY;
    let distFromLine = abs(A * mouseX + B * mouseY + C) / sqrt(A * A + B * B);
    return distFromLine < linkThickness && d < totalLength ;
}

function isMouseOverNode(nodeX, nodeY){
    return mouseX >= nodeX && mouseX <= nodeX + nodeWidth &&
           mouseY >= nodeY && mouseY <= nodeY + nodeWidth;
}

function mouseClicked(){
    for (let node of nodes){
        if(isMouseOverNode(node.x, node.y)){
            selectedNode = (selectedNode === node) ? null : node; // Toggle selection
             drawSankeyDiagram();
        }
    }
}


function windowResized() {
    canvasWidth = windowWidth - 300;
    canvasHeight = windowHeight;
    resizeCanvas(canvasWidth, canvasHeight);
}
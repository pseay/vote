let options = [];
let votes = [];

function addOption() {
  const option = document.getElementById("optionInput").value.trim();
  if (option && !options.includes(option)) {
    options.push(option);
    document.getElementById("optionInput").value = "";
    updateOptionsList();
  } else {
    alert("Please enter a unique, non-empty option.");
  }
}

function clearOptions() {
  sessionStorage.removeItem("options")
  sessionStorage.removeItem("votes")
  location.reload();
}

function updateOptionsList() {
  const list = document.getElementById("optionsList");
  list.innerHTML = "";
  options.forEach((option, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
                    <span>${option}</span>
                    <div>
                        <button onclick="editOption(${index})">Edit</button>
                        <button onclick="removeOption(${index})">Remove</button>
                    </div>
                `;
    list.appendChild(li);
  });
  sessionStorage.setItem('options', JSON.stringify(options));
}

function editOption(index) {
  const newOption = prompt("Edit option:", options[index]);
  if (newOption && newOption.trim() && !options.includes(newOption.trim())) {
    options[index] = newOption.trim();
    updateOptionsList();
  } else if (newOption) {
    alert("Please enter a unique, non-empty option.");
  }
}

function removeOption(index) {
  options.splice(index, 1);
  updateOptionsList();
}

function submitOptions() {
  if (options.length < 2) {
    alert("Please add at least two options.");
    return;
  }
  window.history.pushState({}, "", "?page=vote");
  location.reload();
}

function hash(str) {
  const prime = 31;
  const mod = Math.pow(10, 4) - 1;
  let hashValue = 0;

  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    hashValue = (hashValue * prime + charCode) % mod;
  }

  hashValue += "";
  hashaBet = [..."Z8WDYMQPL0"];
  hashValue = [...hashValue].map((index) => hashaBet[index]).join("");

  return hashValue;
}
function updateUID() {
  document.getElementById("UIDDisplay").innerHTML =
    "Your UID: <strong>" +
    hash(document.getElementById("nameInput").value) +
    "</strong>";
}

function createVotingForm() {
  document.getElementById("nameInput").value = "";
  updateUID();
  const form = document.getElementById("voteForm");
  form.innerHTML = "";
  options.forEach((option, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
                    <span class="drag-handle"></span>
                    <span style="flex-grow: 1; text-align: center;">${option}</span>
                    <input type="number" id="rating_${index}" placeholder="Rating (-5 to 5)" value="0" min="-5" max="5" step="0.5">
                `;
    form.appendChild(li);
  });

  updateRanks();

  new Sortable(form, {
    animation: 150,
    handle: ".drag-handle",
    onEnd: function (evt) {
      updateRanks();
    },
  });
}

function updateRanks() {
  const items = document.getElementById("voteForm").children;
  for (let i = 0; i < items.length; i++) {
    const rankSpan = items[i].querySelector(".rank");
    if (!rankSpan) {
      const span = document.createElement("span");
      span.className = "rank";
      span.style.marginLeft = "10px";
      items[i].insertBefore(span, items[i].children[1]);
    }
    items[i].querySelector(".rank").textContent = `Rank: ${i + 1}`;
  }
}

function submitVote() {
  const voteForm = document.getElementById("voteForm");
  const vote = Array.from(voteForm.children).map((li, rank) => {
    const index = options.indexOf(li.children[2].textContent);
    const rating = parseFloat(li.querySelector('input[type="number"]').value);
    return { index, rank: rank + 1, rating };
  });

  if (vote.some((v) => isNaN(v.rating))) {
    alert("Please fill in all rating fields with valid numbers.");
    return;
  }

  let uid = hash(document.querySelector("#nameInput").value);
  votes.push({ uid, vote });
  sessionStorage.setItem('votes', JSON.stringify(votes));

  const jsConfetti = new JSConfetti();
  jsConfetti.addConfetti({
    emojis: ["👍", "✅", "🗳️", "📃"],
  });

  let submitVoteButton = document.getElementById("submitVoteButton");
  submitVoteButton.onclick = null;
  setTimeout(() => {
    window.history.pushState({}, "", "?page=vote");
    location.reload();
  }, 1000);
}

function finishVoting() {
  if (votes.length === 0) {
    alert("Please submit at least one vote before finishing.");
    return;
  }
  window.history.pushState({}, "", "?page=results");
  location.reload();
}

function calculateResults() {
  const results = {
    firstPastThePost: calculateFirstPastThePost(),
    rankChoice: calculateRankChoice(),
    borda: calculateBorda(),
    approval: calculateApproval(),
    rating: calculateRating(),
  };

  displayVoters();
  displayResults(results);
}

function calculateFirstPastThePost() {
  const counts = new Array(options.length).fill(0);
  votes.forEach(({ uid, vote }) => {
    const winner = vote.find((v) => v.rank === 1).index;
    counts[winner]++;
  });
  return counts;
}

function calculateRankChoice() {
  let remainingOptions = [...options];
  const rounds = [];
  while (remainingOptions.length > 1) {
    const counts = new Array(options.length).fill(0);
    votes.forEach(({ uid, vote }) => {
      const validVote = vote.filter((v) =>
        remainingOptions.includes(options[v.index])
      );
      const winner = validVote.reduce((a, b) =>
        a.rank < b.rank ? a : b
      ).index;
      counts[winner]++;
    });
    rounds.push([...counts]);
    const minVotes = Math.min(...counts.filter((c) => c > 0));
    remainingOptions = remainingOptions.filter((_, i) => counts[i] > minVotes);
  }
  return rounds[rounds.length - 1];
}

function calculateBorda() {
  const scores = new Array(options.length).fill(0);
  votes.forEach(({ uid, vote }) => {
    vote.forEach((v) => {
      scores[v.index] += options.length - v.rank;
    });
  });
  return scores;
}

function calculateApproval() {
  const counts = new Array(options.length).fill(0);
  votes.forEach(({ uid, vote }) => {
    vote.forEach((v) => {
      if (v.rating > 0) counts[v.index]++;
    });
  });
  return counts;
}

function calculateRating() {
  const totals = new Array(options.length).fill(0);
  votes.forEach(({ uid, vote }) => {
    vote.forEach((v) => {
      totals[v.index] += v.rating;
    });
  });
  return totals.map((value) => value / votes.length);
}

function displayVoters() {
  const numVotesContainer = document.getElementById("numVotes");
  numVotesContainer.innerHTML = "";

  let voters = votes.map(({ uid, vote }) => uid);
  for (let i = voters.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [voters[i], voters[j]] = [voters[j], voters[i]];
  }

  let table = document.createElement("table");
  table.innerHTML = `<tr><th># of Votes</th><th>Voters (unordered)</th></tr><tr><td>${
    votes.length
  }</td><td>${voters.join(", ")}</td></tr>`;
  numVotesContainer.appendChild(table);
}

function displayResults(results) {
  let bests = Object.fromEntries(
    Object.entries(results).map(([system, arr]) => [system, Math.max(...arr)])
  );
  const table = document.getElementById("resultsTable");
  table.innerHTML = `
  <tr>
    <th>System</th>
    ${options.map((option) => `<th>${option}</th>`).join("")}
  </tr>
  <tr>
    <th>First Past The Post</th>
    ${results.firstPastThePost
      .map(
        (value) =>
          `<td${
            value == bests.firstPastThePost ? " class='winner'" : ""
          }>${value}</td>`
      )
      .join("")}
  </tr>
  <tr>
    <th>Rank Choice (Final Round)</th>
    ${results.rankChoice
      .map(
        (value) =>
          `<td${
            value == bests.rankChoice ? " class='winner'" : ""
          }>${value}</td>`
      )
      .join("")}
  </tr>
  <tr>
    <th>Borda Count</th>
    ${results.borda
      .map(
        (value) =>
          `<td${value == bests.borda ? " class='winner'" : ""}>${value}</td>`
      )
      .join("")}
  </tr>
  <tr>
    <th>Approval Voting</th>
    ${results.approval
      .map(
        (value) =>
          `<td${value == bests.approval ? " class='winner'" : ""}>${value}</td>`
      )
      .join("")}
  </tr>
  <tr>
    <th>Rating</th>
    ${results.rating
      .map(
        (value) =>
          `<td${value == bests.rating ? " class='winner'" : ""}>${value.toFixed(
            2
          )}</td>`
      )
      .join("")}
  </tr>
`;
}

function resetVoting() {
  const optionsString = JSON.stringify(options);
  sessionStorage.setItem('options', optionsString);

  sessionStorage.removeItem('votes');

  window.history.pushState({}, "", "?page=options");
  location.reload();
}

function showOptionsPage() {
  document.getElementById("optionsSection").style.display = "block";
  document.getElementById("votingSection").style.display = "none";
  document.getElementById("resultsSection").style.display = "none";
  updateOptionsList();
}
function showVotingPage() {
  document.getElementById("optionsSection").style.display = "none";
  document.getElementById("votingSection").style.display = "block";
  document.getElementById("resultsSection").style.display = "none";
  createVotingForm();
}
function showResultsPage() {
  document.getElementById("optionsSection").style.display = "none";
  document.getElementById("votingSection").style.display = "none";
  document.getElementById("resultsSection").style.display = "block";
  calculateResults();
}

window.onload = function () {
  // Load options and votes from sessionStorage 
  const storedOptions = sessionStorage.getItem('options');
  const storedVotes = sessionStorage.getItem('votes');
  if (storedOptions) {
    try {
      options = JSON.parse(storedOptions) || [];
      votes = JSON.parse(storedVotes) || [];
    } catch (error) {
      console.error("Failed to parse stored options or votes:", error);
    }
  }
  console.log({options, votes});
  // Route to correct page
  const urlParams = new URLSearchParams(window.location.search);
  const currentPage = urlParams.get("page");
  console.log({currentPage});
    
  switch(currentPage) {
    case 'vote':
        showVotingPage();
        break;
    case 'results':
        showResultsPage();
        break;
    default:
        showOptionsPage();
  }
};

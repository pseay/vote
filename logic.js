let options = [];
let votes = [];
let uids = new Set();

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
  document.getElementById("optionsSection").style.display = "none";
  document.getElementById("votingSection").style.display = "block";
  createVotingForm();
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
  hashaBet = [..."Z8WDYMQPL0"]
  hashValue = [...hashValue].map(index => hashaBet[index]).join("")

  return hashValue;
}
function updateUID() {
  document.getElementById("UIDDisplay").innerText="Your UID: " + hash(document.getElementById("nameInput").value)
}

function createVotingForm() {
  document.getElementById("nameInput").value="";
  updateUID();
  const form = document.getElementById("voteForm");
  form.innerHTML = "";
  options.forEach((option, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
                    <span class="drag-handle"></span>
                    <span>${option}</span>
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
  alert(`Vote submitted!`);
  createVotingForm();
}

function finishVoting() {
  if (votes.length === 0) {
    alert("Please submit at least one vote before finishing.");
    return;
  }
  document.getElementById("votingSection").style.display = "none";
  document.getElementById("resultsSection").style.display = "block";
  calculateResults();
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
  displayWinners(results);
  displayResults(results);
}

function calculateFirstPastThePost() {
  const counts = new Array(options.length).fill(0);
  votes.forEach(({uid, vote}) => {
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
    votes.forEach(({uid, vote}) => {
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
  votes.forEach(({uid, vote}) => {
    vote.forEach((v) => {
      scores[v.index] += options.length - v.rank + 1;
    });
  });
  return scores;
}

function calculateApproval() {
  const counts = new Array(options.length).fill(0);
  votes.forEach(({uid, vote}) => {
    vote.forEach((v) => {
      if (v.rating > 0) counts[v.index]++;
    });
  });
  return counts;
}

function calculateRating() {
  const totals = new Array(options.length).fill(0);
  votes.forEach(({uid, vote}) => {
    vote.forEach((v) => {
      totals[v.index] += v.rating;
    });
  });
  return totals;
}

function displayVoters() {
  const numVotesContainer = document.getElementById("numVotes");
  numVotesContainer.innerHTML = "";

  let span = document.createElement("p");
  span.innerHTML = `# of votes: ${votes.length}`;
  numVotesContainer.appendChild(span);

  let voterIds = document.createElement("p");
  voterIds.innerHTML = `Voters: ${votes.map(({uid, vote}) => uid).join(", ")}`;
  numVotesContainer.appendChild(voterIds);
}

function displayWinners(results) {
  const winnersContainer = document.getElementById("winnersContainer");
  winnersContainer.innerHTML = "";

  const systems = {
    firstPastThePost: "First Past The Post",
    rankChoice: "Rank Choice",
    borda: "Borda Count",
    approval: "Approval Voting",
    rating: "Rating",
  };

  for (const [system, name] of Object.entries(systems)) {
    const winner =
      options[results[system].indexOf(Math.max(...results[system]))];
    const p = document.createElement("p");
    p.innerHTML = `<strong>${name} Winner:</strong> ${winner}`;
    winnersContainer.appendChild(p);
  }
}

function displayResults(results) {
  const table = document.getElementById("resultsTable");
  table.innerHTML = `
                <tr>
                    <th>Option</th>
                    <th>First Past The Post</th>
                    <th>Rank Choice (Final Round)</th>
                    <th>Borda Count</th>
                    <th>Approval Voting</th>
                    <th>Rating</th>
                </tr>
                ${options
                  .map(
                    (option, i) => `
                    <tr>
                        <td>${option}</td>
                        <td>${results.firstPastThePost[i]}</td>
                        <td>${results.rankChoice[i]}</td>
                        <td>${results.borda[i]}</td>
                        <td>${results.approval[i]}</td>
                        <td>${results.rating[i].toFixed(2)}</td>
                    </tr>
                `
                  )
                  .join("")}
            `;
}

function resetVoting() {
  votes = [];
  document.getElementById("optionsSection").style.display = "block";
  document.getElementById("votingSection").style.display = "none";
  document.getElementById("resultsSection").style.display = "none";
  updateOptionsList();
}

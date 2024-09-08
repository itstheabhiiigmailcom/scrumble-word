const wordText = document.querySelector(".word");
const hintText = document.querySelector(".hint span");
const timeText = document.querySelector(".time b");
refreshBtn = document.querySelector(".refresh-word");
checkBtn = document.querySelector(".check-word");
inputField = document.querySelector("input");

let correctWord, timer ;

const initTimer = maxTime => {
    clearInterval(timer)
    timer = setInterval(() => {
        if(maxTime > 0) {
            maxTime--;
            return timeText.innerText = maxTime;
        }
        clearInterval(timer)
        alert(`Timer off! ${correctWord.toUpperCase()} was the correct word`);
        initGame();     // to again restart the game
    }, 1000);
}

const initGame = () => {
    initTimer(30);
    let randomObj = words[Math.floor(Math.random()*words.length)];            // getting random objects from words
    // splitting each letter of random word
    let wordArray = randomObj.word.split("");
    for(let i = wordArray.length-1; i>0; i--){
        let  j = Math.floor(Math.random() * (i+1));             // getting random number
        [wordArray[i], wordArray[j]] = [wordArray[j], wordArray[i]];    // shuffling and swapping letters of wordArray
    }
    wordText.innerText = wordArray.join("")             // passing shuffle word as word text
    hintText.innerText = randomObj.hint                 // passing random hint as hint text

    correctWord = randomObj.word.toLowerCase();
    inputField.value = "";                                          // making input field empty
    inputField.setAttribute("maxlength", correctWord.length);       // setting input maxlength attribute to word length
}
initGame();

const checkWord = () => {
    let userWord = inputField.value.toLocaleLowerCase();        // getting user value
    if(!userWord)  return alert("Please enter a word check");
    if(userWord !== correctWord) return alert(`Oops! ${userWord} is not a correct word`);
    alert(`Congrats! ${userWord.toUpperCase()} is a correct word`);
    initGame();
}

refreshBtn.addEventListener("click", initGame);
checkBtn.addEventListener("click", checkWord);
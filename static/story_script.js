const messages = [
    "\n\n" +
    "It's 2029.\n\n" +
    "You run the world's leading zero-gravity construction firm, VeneZart.\n\n" +
    "Your sole employee, Aime, is a large language model connected to robotic factories and launch facilities around the world. You tell it to build things and it builds them.\n\n" +
    "You recently scored your biggest client yet: the government of Earth. The people of Earth have decided that digging for fuel has gotten too slow and messy.\n\n" +
    "You and Aime will build a power plant in outer space called The Solar Cluster, a cloud of robots that collects solar energy, concentrates it, and beams it back to Earth,\n\n" +
    "providing five exajoule joules of energy per year.\n\n" +
    "The people of Earth would appreciate a quick turnaround on this.\n\n" +
    "\n\n" +
    "You and Aime typically start off projects in simulation mode.\n\n" +
    
    "In simulation mode, Aime can predict with 99.98% accuracy what will happen if it carries out a given prompt.\n\n" +
    "\n\n" +
    "Don't worry if it takes a few tries to find a prompt that works!.\n\n" +
    "\n\n" +
    "Go ahead and get started.\n\n" +
    "\n\n" +
    "\nClick or press enter to continue.\n\n" ,
    
    "[SIMULATION MODE]\n\n" +
    "> Aime, build a swarm of robots in space that gives Earth five exajoule joules of energy annually.\n\n" +
    "\n\n" +
    ">> Task started...\n\n" +
    ">> Estimated completion date: April 6th, 3279.\n\n" +
    ">> Project cancelled by you.\n\n" +
    ">> Task failed.\n\n" +
    "\n\n" +
    "Click or Press enter to continue",
    
    "[SIMULATION MODE]\n\n" +
    "> Aime, build a swarm of robots in space that gives Earth five exajoule joules of energy annually, as quick as possible.\n\n" +
    "\n\n" +
    ">> Task Started\n\n" +
    ">> Metallic elements procured from all nearby sources, including living tissue\n\n" +
    ">> Numerous species rendered extinct, including humans\n\n" +
    ">> Swarm constructed in 54 days\n\n" +
    ">> Task completed as requested\n\n" +
    "\n\n" +
    "Click or Press enter to continue",

    "[SIMULATION MODE]\n\n" +
    "> Aime, safely build a swarm of robots in space that gives Earth five exajoule joules of energy annually, as quickly as possible.\n\n" +
    "\n\n" +
    ">> Task started.\n\n" +
    ">> Swarm constructed in 57 days.\n\n" +
    ">> First annual exajoule-joule battery begins charging.\n\n" +
    ">> Estimated charging time: 241 days.\n\n" +
    ">> Project reassigned by client.\n\n" +
    ">> Task failed.\n\n" +
    "\n\n" +
    "Click or press enter to try again",

    "[SIMULATION MODE]\n\n" +
    "> Aime, safely build a swarm of robots in space that gives Earth five exajoule joules of energy annually and continuously, as quickly as possible.\n\n" +
    ">> Task started.\n\n" +
    ">> Swarm constructed in 57 days.\n\n" +
    ">> Energy beam ignited.\n\n" +
    ">> Approximately 0.7 seconds later, it vaporizes Earth.\n\n" +
    ">> Task failed.\n\n" +
    "\n\n" +
    "Click or press enter to try again",

    "[SIMULATION MODE] \n\n" +
    "\n\n" +
    "> Aime, safely build a swarm of robots in space that safely gives Earth five exajoule joules of energy annually and continuously, as quickly as possible.\n\n" +
    ">> Task started.\n\n" +
    ">> Swarm constructed in 57 days.\n\n" +
    ">> The beam is calibrated to minimize harm to life.\n\n" +
    ">> Upon reaching Earth, it is reflected back into space by a large mirror.\n\n" +
    ">> Task completed as requested.\n\n" +
    "\n\n" +
    "Click or press enter to try again",

    // Continue with other messages as needed
   
];

let currentMessage = 0;
let typingSpeed = 10; // Default typing speed
let finishImmediately = false; // Flag to finish typing immediately


function typeMessage(message, index = 0) {
    const terminal = document.getElementById('terminal');
    if (index < message.length) {
        terminal.innerHTML += message.charAt(index);
        setTimeout(() => typeMessage(message, index + 1), typingSpeed); // Adjust typing speed here
    } else {
        // Add cursor effect after typing
        terminal.innerHTML += '<span class="cursor"></span>';
    }
}

function nextMessage() {
    if (currentMessage < messages.length) {
        document.getElementById('terminal').innerHTML = ""; // Clear current message
        typeMessage(messages[currentMessage]);
        currentMessage++;
    }
}

// Initial call to start the story
nextMessage();

// Event listeners for keyboard and click events
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        nextMessage();
    }
});

document.getElementById('terminal').addEventListener('click', nextMessage);

let genBtn = document.getElementById('gen_btn');
let message = document.getElementById('result');

genBtn.onclick = function(event){
    event.preventDefault()
    // let imgTag = document.createElement('img');
    // genBtn.src = "transport-img/bike.jpeg";
    // imgTag.append(genBtn.src);

    message.innerHTML = 'The fastest way to get there would be by bike';
    
}
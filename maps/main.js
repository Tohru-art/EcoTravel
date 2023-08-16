let genBtn = document.getElementById('gen_btn');
let message = document.getElementById('result');
let imgTag = document.getElementById('result_img');

genBtn.onclick = function(event){
    event.preventDefault()

    message.innerHTML = 'The fastest way to get there would be by bike';

    imgTag.src = "transport-img/bike.jpeg";
}
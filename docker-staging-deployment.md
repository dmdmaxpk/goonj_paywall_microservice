$  docker build -t localhost:5000/goonj_paywall_v2:2.0.0 .  
$  docker push localhost:5000/goonj_paywall_v2:2.0.0   
$  docker stack deploy -c paywall-staging-stack.yaml paywall-staging  


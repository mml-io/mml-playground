# Setting up MML Playground on AWS Lightsail

## Set up a Lightsail account

This guide assumes you already have an AWS account. If you don't have one, you can create one at: <https://aws.amazon.com/>

Once you have your account, the first step will be to create your AWS Lightsail Instance if you haven't done that already, making sure you select a region closer to your users or community for better connectivity.

You can create a new instance at <https://lightsail.aws.amazon.com/> by clicking the "Create instance" button. Then you can select your instance plan (keep in mind that, at the moment this guide was written, any plans to the $10 plan will allow you to use them for free for the first 3 months, and their specs are good enough to host the MML Playground). As the choice for the operating system, Ubuntu Server 22.04 LTS will certainly offer everything you'll need to run the Playground, and due to its popularity, you'll have an easier time finding answers on how to manage it or installing further things you may want to use it for.

Once you have your Instance created and running (it usually takes a few minutes after its creation), you can jump straight into accessing it through SSH using the little terminal icon on your Instance label (screenshot below). That will grant you access through SSH on a web browser.

In case you want to access it through SSH on a Terminal or other SSH applications like PuTTY, you can follow the steps explained here: <https://lightsail.aws.amazon.com/ls/docs/en_us/articles/understanding-ssh-in-amazon-lightsail> to manage the SSH keys required to access your VPS.

## Update your Linux distribution

Once logged in through SSH, please perform a full system update through the following command:

```bash
sudo apt udate && sudo apt upgrade
```

After that, you're ready to install NodeJS, which is the only dependency required to run the playground. The easier and most flexible way to install NodeJS is through a tool called NVM, which you can install by running the following command:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
```

After having nvm installed, you can install the latest LTS version of Node by running the following command:

```bash
nvm install –lts
```

## Cloning the MML Playground

All that done, you're ready to run the playground by cloning the repository and running it.

To clone the MML Playground, run the following command:

```bash
git clone https://github.com/mml-io/mml-playground.git
```

Then you have to install its dependencies by going to its directory and installing all the required packages, through the following commands:

```bash
cd mml-playground
```

```bash
npm install
```

And to run the Playground:

 ```bash
 npm run iterate
 ```

## Getting the Playground accessible through the Web

There are a few extra steps so you can access your Playground. The first one is getting a static IP address for your LightSail Instance, which you can do by clicking a `Create static IP` button at <https://lightsail.aws.amazon.com/ls/webapp/home/networking>

The second one is to allow the connections to port 8080 (which is the port the Playground uses to receive incoming connections). To do so, you can do to your Instances tab, click on the three dots of your instance, click on Manage, go to the Networking tab, and add a new Custom Firewall rule to allow TCP connections to port `8080` (please see the screenshots below).

With your static IP set and your playground running, you can test it by going to:

`http://<your_static_ip>:8080`

## Assigning a Root Domain to your instance

You may assign a root domain to your instance by clicking in `Networking` on the left panel, going to `Domains` and clicking on `Assign domain` to point a domain name to the static IP you created. To know more details about pointing your domain to a Lightsail Instance, you can check the [official How to guide](https://lightsail.aws.amazon.com/ls/docs/en_us/articles/amazon-lightsail-routing-to-instance) about it on AWS.

## Installing Nginx as a proxy

Nginx will act as a proxy to pass the connections for your IP address on the default port to 8080.

To install Nginx, just run the following command on your AWS instance:

```bash
sudo apt install nginx
```

To prepare Nginx to proxy your default income connection at port 80 to port 8080 (the port the MML Playground listens to), you may create a file at:

`/etc/nginx/sites-available/<YOUR_ROOT_DOMAIN_NAME>`

The content of your config should look like:

```nginx
server {
    server_name <root_domain_name>;
    root /home/ubuntu/mml-playground;

    index index.html;

    location / {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    gzip on;
    gzip_http_version  1.1;
    gzip_proxied any;
    gzip_vary on;
    gzip_min_length 256;
    gzip_comp_level 6;
    gzip_types application/atom+xml application/javascript application/json application/rss+xml application/vnd.ms-fontobject application/x-font-ttf application/x-web-app-manifest+json application/xhtml+xml application/xml font/opentype image/svg+xml image/x-icon text/css text/plain text/xml text/x-component application/xml+rss text/javascript;

}
```

After creating the config file, you have to create a symlink pointing to it at:

`/etc/nginx/sites-enabled/`

To craete the symlink, run the following command:

```bash
sudo ln -s /etc/nginx/sites-available/YOUR_CONFIG_FILE /etc/nginx/sites-enabled/.
```

After creating and symlinking the file, you may test if your config is properly written by running the command:

```bash
sudo nginx -t
```

Once everything is ok, you may obtain an SSL certificate using Certbot.

You can install Certbot by running the following command:

```bash
sudo apt install certbot python3-certbot-nginx
```

After installed, you may generate your certificate by running:

```bash
sudo certbot --nginx
```

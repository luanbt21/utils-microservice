const url = new URL("");

const { protocol, host, href, pathname, username, password, hostname } = url;

console.log({ protocol, host, href, pathname, username, password, hostname });

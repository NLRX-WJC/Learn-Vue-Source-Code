/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app and you should
 * disable HTTP caching for this file too.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */

importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js");

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
self.__precacheManifest = [
  {
    "url": "404.html",
    "revision": "81b29c3103d4b39d8c7b020d0f4e9f49"
  },
  {
    "url": "assets/BuiltInComponents/1.gif",
    "revision": "6ca41eec5e31e3dfe02deb623d77e40a"
  },
  {
    "url": "assets/BuiltInComponents/2.gif",
    "revision": "f2c26398e59654d015df555d73d7e567"
  },
  {
    "url": "assets/BuiltInComponents/3.png",
    "revision": "bfadecb3205d7747a74b6ca40c700460"
  },
  {
    "url": "assets/BuiltInComponents/4.gif",
    "revision": "97ae2a0a75b357bb7aafacd18f8f4ba9"
  },
  {
    "url": "assets/complie/1.png",
    "revision": "f0570125eb8822928478517981b11731"
  },
  {
    "url": "assets/complie/2.png",
    "revision": "5596631afab5bd42ff54308ab5caf407"
  },
  {
    "url": "assets/complie/3.png",
    "revision": "15d9566b1b67acf63ce0a77bd5fc8c15"
  },
  {
    "url": "assets/complie/4.png",
    "revision": "16462ada9bae217a77c6a50eff566ec2"
  },
  {
    "url": "assets/complie/5.png",
    "revision": "8af3217e7f462450e406a466cf3c98a3"
  },
  {
    "url": "assets/complie/6.png",
    "revision": "b5792c464900e4fdf5f626688d79b61a"
  },
  {
    "url": "assets/complie/7.png",
    "revision": "6ca1dbf075647915f7976acf72f302b2"
  },
  {
    "url": "assets/complie/8.jpg",
    "revision": "ad277be00d14d90a50e064aedae2cd4a"
  },
  {
    "url": "assets/complie/9.png",
    "revision": "a0a38f3f5d5ee0f993cdaf917a712ffc"
  },
  {
    "url": "assets/css/0.styles.8f9bdb31.css",
    "revision": "7f84675f01560aec0096182bc961eb6f"
  },
  {
    "url": "assets/filter/1.jpg",
    "revision": "db8412c9eb63dba2fc639ed9a037368a"
  },
  {
    "url": "assets/filter/2.jpg",
    "revision": "8743140ff4a6977c0944da8f530cbb39"
  },
  {
    "url": "assets/filter/3.jpg",
    "revision": "ec8d7d0370309c5bb64bb6f9eae6dff9"
  },
  {
    "url": "assets/filter/4.jpg",
    "revision": "8fba6173e1aa83a465a8120d3f3a0dfa"
  },
  {
    "url": "assets/img/1.6ca41eec.gif",
    "revision": "6ca41eec5e31e3dfe02deb623d77e40a"
  },
  {
    "url": "assets/img/1.6e1e57be.jpg",
    "revision": "6e1e57be4ac7569b66bc8e3ff85b4c87"
  },
  {
    "url": "assets/img/1.86404441.png",
    "revision": "8640444157c33373fc96f4851b7b2edc"
  },
  {
    "url": "assets/img/1.a052465d.png",
    "revision": "a052465d12384c5358090501a832312d"
  },
  {
    "url": "assets/img/1.db8412c9.jpg",
    "revision": "db8412c9eb63dba2fc639ed9a037368a"
  },
  {
    "url": "assets/img/1.ec40be4a.jpg",
    "revision": "ec40be4a11d550dfeebc4385347ed132"
  },
  {
    "url": "assets/img/1.f0570125.png",
    "revision": "f0570125eb8822928478517981b11731"
  },
  {
    "url": "assets/img/10.cf98adc0.png",
    "revision": "cf98adc09dfd3eb21e6f13fb084df9d7"
  },
  {
    "url": "assets/img/11.2ddb5ee5.png",
    "revision": "2ddb5ee5e7f7f19bf77f75abdd62bf56"
  },
  {
    "url": "assets/img/12.bace2f7f.png",
    "revision": "bace2f7fb11962cc182b80f0eefb06e4"
  },
  {
    "url": "assets/img/13.98dbc208.png",
    "revision": "98dbc2082450bee66b7b3345d3906356"
  },
  {
    "url": "assets/img/14.18c1c6dd.png",
    "revision": "18c1c6ddc16ffbe377e4218cb17a59ab"
  },
  {
    "url": "assets/img/15.e9bdf5c1.png",
    "revision": "e9bdf5c1958f766c3d7be6cb48e4c169"
  },
  {
    "url": "assets/img/2.02d5c7b1.png",
    "revision": "02d5c7b1930a1238a9bfd814c11c07cb"
  },
  {
    "url": "assets/img/2.3828fb66.png",
    "revision": "3828fb66a442259f9cb671e991ea8487"
  },
  {
    "url": "assets/img/2.5596631a.png",
    "revision": "5596631afab5bd42ff54308ab5caf407"
  },
  {
    "url": "assets/img/2.8743140f.jpg",
    "revision": "8743140ff4a6977c0944da8f530cbb39"
  },
  {
    "url": "assets/img/2.b446ab83.png",
    "revision": "b446ab834db2822c6bf817be835b2ef8"
  },
  {
    "url": "assets/img/2.f2c26398.gif",
    "revision": "f2c26398e59654d015df555d73d7e567"
  },
  {
    "url": "assets/img/3.0b99330d.jpg",
    "revision": "0b99330df8a6e8393ee0f89953df79d0"
  },
  {
    "url": "assets/img/3.15d9566b.png",
    "revision": "15d9566b1b67acf63ce0a77bd5fc8c15"
  },
  {
    "url": "assets/img/3.7b0442aa.png",
    "revision": "7b0442aa3cd674f486654c33280ecdfa"
  },
  {
    "url": "assets/img/3.8d0dc6f5.png",
    "revision": "8d0dc6f523c37d116de241d61de30b3d"
  },
  {
    "url": "assets/img/3.bfadecb3.png",
    "revision": "bfadecb3205d7747a74b6ca40c700460"
  },
  {
    "url": "assets/img/3.ec8d7d03.jpg",
    "revision": "ec8d7d0370309c5bb64bb6f9eae6dff9"
  },
  {
    "url": "assets/img/4.16462ada.png",
    "revision": "16462ada9bae217a77c6a50eff566ec2"
  },
  {
    "url": "assets/img/4.6a76bb54.png",
    "revision": "6a76bb54293d6c1c87da2c215ced104e"
  },
  {
    "url": "assets/img/4.8fba6173.jpg",
    "revision": "8fba6173e1aa83a465a8120d3f3a0dfa"
  },
  {
    "url": "assets/img/4.97ae2a0a.gif",
    "revision": "97ae2a0a75b357bb7aafacd18f8f4ba9"
  },
  {
    "url": "assets/img/4.cb62f1aa.png",
    "revision": "cb62f1aa1a4d26cea40592798224143f"
  },
  {
    "url": "assets/img/5.bcb4dcee.png",
    "revision": "bcb4dceea98b8c1f67dcfcd08f627824"
  },
  {
    "url": "assets/img/5.e43324ab.png",
    "revision": "e43324aba93e61f03b12815fffa57c1e"
  },
  {
    "url": "assets/img/6.4c45da1c.png",
    "revision": "4c45da1c38991ee2838dbf54b0679d42"
  },
  {
    "url": "assets/img/6.b9621b4d.png",
    "revision": "b9621b4d74ba20cd0d8f46d361f75afb"
  },
  {
    "url": "assets/img/7.057d7609.jpg",
    "revision": "057d76096455fb37aba585c4f4e3fe17"
  },
  {
    "url": "assets/img/7.6ca1dbf0.png",
    "revision": "6ca1dbf075647915f7976acf72f302b2"
  },
  {
    "url": "assets/img/7.810540a5.png",
    "revision": "810540a5ea3d36ba9b8525b05c793fb3"
  },
  {
    "url": "assets/img/8.ad277be0.jpg",
    "revision": "ad277be00d14d90a50e064aedae2cd4a"
  },
  {
    "url": "assets/img/8.e4c85c40.png",
    "revision": "e4c85c40d285e1c23b9669d5cccf9c31"
  },
  {
    "url": "assets/img/9.a0a38f3f.png",
    "revision": "a0a38f3f5d5ee0f993cdaf917a712ffc"
  },
  {
    "url": "assets/img/9.e017b452.png",
    "revision": "e017b45275be5239fb59ba4e6e12cda9"
  },
  {
    "url": "assets/img/search.83621669.svg",
    "revision": "83621669651b9a3d4bf64d1a670ad856"
  },
  {
    "url": "assets/instanceMethods/1.jpg",
    "revision": "ec40be4a11d550dfeebc4385347ed132"
  },
  {
    "url": "assets/js/10.08bd2e1c.js",
    "revision": "e2e8e5754387cf73643eae51d404aec6"
  },
  {
    "url": "assets/js/11.0e8fef6f.js",
    "revision": "bf181aa3f82c9a4647ddd15a703aed88"
  },
  {
    "url": "assets/js/12.a4ee07da.js",
    "revision": "02a969e5b5c0da4225a213695cc7c3b9"
  },
  {
    "url": "assets/js/13.f296c7f1.js",
    "revision": "b038a3bd683547206c30eb86dc11e7d6"
  },
  {
    "url": "assets/js/14.be47c259.js",
    "revision": "00ff8326af57528fcedfc88e51c92cb9"
  },
  {
    "url": "assets/js/15.0ce9c107.js",
    "revision": "1984983b2d1f32b27f84c47ab58a7ab1"
  },
  {
    "url": "assets/js/16.5af2b5f2.js",
    "revision": "32912e7956ab4a34a783ba9b812bfd0c"
  },
  {
    "url": "assets/js/17.032d7262.js",
    "revision": "0fc6428c4977f22b8fc6f1c259a69247"
  },
  {
    "url": "assets/js/18.544e329d.js",
    "revision": "be10fb679665b87da320294e8d748fd9"
  },
  {
    "url": "assets/js/19.8cdde07a.js",
    "revision": "b911390ba1632cda18d348d20b2ceeae"
  },
  {
    "url": "assets/js/2.50730326.js",
    "revision": "f0ab030003e9f292f9efc2ea4a480f98"
  },
  {
    "url": "assets/js/20.5ed6468e.js",
    "revision": "6b3ff464fcee00aef3ee2d68325abddc"
  },
  {
    "url": "assets/js/21.44be4351.js",
    "revision": "d36a77a5b6fbdac6821c5e79926f4ea5"
  },
  {
    "url": "assets/js/22.a33e7370.js",
    "revision": "7eee6b0ee04679a279c28f5bb749ab50"
  },
  {
    "url": "assets/js/23.2a36f938.js",
    "revision": "18e75be6189a8142b7de9a40ff69f8dd"
  },
  {
    "url": "assets/js/24.1bc20ede.js",
    "revision": "b881fd35b31be8cf71ce83972cdb2fe8"
  },
  {
    "url": "assets/js/25.2db8f610.js",
    "revision": "91abb3752d1e88386789b60a511db416"
  },
  {
    "url": "assets/js/26.08be7879.js",
    "revision": "aa36e932528e797301a01d8a1d3ba1a1"
  },
  {
    "url": "assets/js/27.48abc23a.js",
    "revision": "b7fe1c05dc1916c8cd57d96ac8567d9a"
  },
  {
    "url": "assets/js/28.fe279af5.js",
    "revision": "264a4dfadb55d6798dcf1675be6c2f37"
  },
  {
    "url": "assets/js/29.c25dd8a0.js",
    "revision": "3b7b9c591214c223e1f70312c4fecfb5"
  },
  {
    "url": "assets/js/3.88a3804a.js",
    "revision": "4fd2a2a89f7cb177307f966fccbb2ef7"
  },
  {
    "url": "assets/js/30.544c0387.js",
    "revision": "b152f1ee05e4edc9d3d3ea5459478403"
  },
  {
    "url": "assets/js/31.ff037004.js",
    "revision": "a8ae160e212b605d4998ef6efa30ac91"
  },
  {
    "url": "assets/js/32.8913dffb.js",
    "revision": "8a929c8e4593f1f5309e36aa07e095b4"
  },
  {
    "url": "assets/js/33.35e8ba55.js",
    "revision": "3ffc6051428afee412e3aec349b2fe3c"
  },
  {
    "url": "assets/js/34.764e62e9.js",
    "revision": "c8fd4b7b5c18ab9010bb887a691a49ad"
  },
  {
    "url": "assets/js/35.20f385a1.js",
    "revision": "87f04435cc4775c9b52163eecbd13ddd"
  },
  {
    "url": "assets/js/36.33b87e8c.js",
    "revision": "cb97e9e4565d081060f45cb3f767e22c"
  },
  {
    "url": "assets/js/37.4ea5622b.js",
    "revision": "908548690c436c65d769643d1936a2f3"
  },
  {
    "url": "assets/js/38.02f91431.js",
    "revision": "eba07bcb2471af5f1d8c652020598fff"
  },
  {
    "url": "assets/js/39.8ba1fbee.js",
    "revision": "e2c24f4cf1b7b079b7cab3db9b067366"
  },
  {
    "url": "assets/js/4.00816bea.js",
    "revision": "16b17643316f75ab68ae9f696791b47c"
  },
  {
    "url": "assets/js/40.eee0d65e.js",
    "revision": "5191adeeb297d8e55e24eb9deee22a45"
  },
  {
    "url": "assets/js/41.1dfa3559.js",
    "revision": "beb0ec0f67762727100e642c47e9ae1e"
  },
  {
    "url": "assets/js/42.6654d757.js",
    "revision": "10e3ab04e1568f526a3c5916661d515d"
  },
  {
    "url": "assets/js/5.d6db7f42.js",
    "revision": "58f9be62359ffb8cf69e1bf470319c3e"
  },
  {
    "url": "assets/js/6.e05da01e.js",
    "revision": "798a7c2f9dcf2f9f7b78056f6ea42b55"
  },
  {
    "url": "assets/js/7.799f1514.js",
    "revision": "08677f6705b7f23ff7848ca8549c9461"
  },
  {
    "url": "assets/js/8.1ec8b564.js",
    "revision": "97d1a3c7b0b32a9e540a47a9431612a3"
  },
  {
    "url": "assets/js/9.ef20864d.js",
    "revision": "e3ebc43d72c05e7b0636c7608ed2154c"
  },
  {
    "url": "assets/js/app.739e1ebb.js",
    "revision": "f5970d00785c1dba74821a72a6154e98"
  },
  {
    "url": "assets/lifecycle/1.jpg",
    "revision": "6e1e57be4ac7569b66bc8e3ff85b4c87"
  },
  {
    "url": "assets/lifecycle/2.png",
    "revision": "3828fb66a442259f9cb671e991ea8487"
  },
  {
    "url": "assets/lifecycle/3.png",
    "revision": "8d0dc6f523c37d116de241d61de30b3d"
  },
  {
    "url": "assets/lifecycle/4.png",
    "revision": "6a76bb54293d6c1c87da2c215ced104e"
  },
  {
    "url": "assets/lifecycle/5.png",
    "revision": "e43324aba93e61f03b12815fffa57c1e"
  },
  {
    "url": "assets/lifecycle/6.png",
    "revision": "4c45da1c38991ee2838dbf54b0679d42"
  },
  {
    "url": "assets/lifecycle/7.png",
    "revision": "810540a5ea3d36ba9b8525b05c793fb3"
  },
  {
    "url": "assets/reactive/1.png",
    "revision": "8640444157c33373fc96f4851b7b2edc"
  },
  {
    "url": "assets/reactive/2.png",
    "revision": "b446ab834db2822c6bf817be835b2ef8"
  },
  {
    "url": "assets/reactive/3.jpg",
    "revision": "0b99330df8a6e8393ee0f89953df79d0"
  },
  {
    "url": "assets/start/1.png",
    "revision": "4fa9d829aab20d4a0ab50573afa5ca39"
  },
  {
    "url": "assets/virtualDOM/1.png",
    "revision": "a052465d12384c5358090501a832312d"
  },
  {
    "url": "assets/virtualDOM/10.png",
    "revision": "cf98adc09dfd3eb21e6f13fb084df9d7"
  },
  {
    "url": "assets/virtualDOM/11.png",
    "revision": "2ddb5ee5e7f7f19bf77f75abdd62bf56"
  },
  {
    "url": "assets/virtualDOM/12.png",
    "revision": "bace2f7fb11962cc182b80f0eefb06e4"
  },
  {
    "url": "assets/virtualDOM/13.png",
    "revision": "98dbc2082450bee66b7b3345d3906356"
  },
  {
    "url": "assets/virtualDOM/14.png",
    "revision": "18c1c6ddc16ffbe377e4218cb17a59ab"
  },
  {
    "url": "assets/virtualDOM/15.png",
    "revision": "e9bdf5c1958f766c3d7be6cb48e4c169"
  },
  {
    "url": "assets/virtualDOM/2.png",
    "revision": "02d5c7b1930a1238a9bfd814c11c07cb"
  },
  {
    "url": "assets/virtualDOM/3.png",
    "revision": "7b0442aa3cd674f486654c33280ecdfa"
  },
  {
    "url": "assets/virtualDOM/4.png",
    "revision": "cb62f1aa1a4d26cea40592798224143f"
  },
  {
    "url": "assets/virtualDOM/5.png",
    "revision": "bcb4dceea98b8c1f67dcfcd08f627824"
  },
  {
    "url": "assets/virtualDOM/6.png",
    "revision": "b9621b4d74ba20cd0d8f46d361f75afb"
  },
  {
    "url": "assets/virtualDOM/7.jpg",
    "revision": "057d76096455fb37aba585c4f4e3fe17"
  },
  {
    "url": "assets/virtualDOM/8.png",
    "revision": "e4c85c40d285e1c23b9669d5cccf9c31"
  },
  {
    "url": "assets/virtualDOM/9.png",
    "revision": "e017b45275be5239fb59ba4e6e12cda9"
  },
  {
    "url": "BuiltInComponents/keep-alive.html",
    "revision": "a7cc7beadaee21407b835385e69b66d9"
  },
  {
    "url": "complie/codegen.html",
    "revision": "3297471948e4e6b9af97d2f8142b715c"
  },
  {
    "url": "complie/HTMLParse.html",
    "revision": "733efbb986439772ccf9f62c1dee7cf1"
  },
  {
    "url": "complie/index.html",
    "revision": "3a7605c85a0eefa82ae0f212034a2eb7"
  },
  {
    "url": "complie/optimize.html",
    "revision": "dc6209239767b7847347e5e75216a601"
  },
  {
    "url": "complie/parse.html",
    "revision": "db6311a70caf097482c6e24c281a7b9d"
  },
  {
    "url": "complie/summary.html",
    "revision": "84fefe1b4c61846cfc71ab0fbc1467bd"
  },
  {
    "url": "complie/textParse.html",
    "revision": "ff4fc66d8428283a2406a8d488845c66"
  },
  {
    "url": "directives/customDirectives.html",
    "revision": "b5ef45f558b9429172284cdaa2d599e4"
  },
  {
    "url": "filter/filterPrinciple.html",
    "revision": "00e63337d0100ff701c98959eba32701"
  },
  {
    "url": "filter/index.html",
    "revision": "6a469133d115e92458efdbea5f8bcfb4"
  },
  {
    "url": "filter/parseFilters.html",
    "revision": "c31a73cdca66613ea128a8d31e8e4017"
  },
  {
    "url": "globalAPI/index.html",
    "revision": "9c5b1524d50e75eb1b6ef47671de144a"
  },
  {
    "url": "icons/android-chrome-192x192.png",
    "revision": "f130a0b70e386170cf6f011c0ca8c4f4"
  },
  {
    "url": "icons/android-chrome-512x512.png",
    "revision": "0ff1bc4d14e5c9abcacba7c600d97814"
  },
  {
    "url": "icons/apple-touch-icon-120x120.png",
    "revision": "936d6e411cabd71f0e627011c3f18fe2"
  },
  {
    "url": "icons/apple-touch-icon-152x152.png",
    "revision": "1a034e64d80905128113e5272a5ab95e"
  },
  {
    "url": "icons/apple-touch-icon-180x180.png",
    "revision": "c43cd371a49ee4ca17ab3a60e72bdd51"
  },
  {
    "url": "icons/apple-touch-icon-60x60.png",
    "revision": "9a2b5c0f19de617685b7b5b42464e7db"
  },
  {
    "url": "icons/apple-touch-icon-76x76.png",
    "revision": "af28d69d59284dd202aa55e57227b11b"
  },
  {
    "url": "icons/apple-touch-icon.png",
    "revision": "66830ea6be8e7e94fb55df9f7b778f2e"
  },
  {
    "url": "icons/favicon-16x16.png",
    "revision": "4bb1a55479d61843b89a2fdafa7849b3"
  },
  {
    "url": "icons/favicon-32x32.png",
    "revision": "98b614336d9a12cb3f7bedb001da6fca"
  },
  {
    "url": "icons/msapplication-icon-144x144.png",
    "revision": "b89032a4a5a1879f30ba05a13947f26f"
  },
  {
    "url": "icons/mstile-150x150.png",
    "revision": "058a3335d15a3eb84e7ae3707ba09620"
  },
  {
    "url": "icons/safari-pinned-tab.svg",
    "revision": "f22d501a35a87d9f21701cb031f6ea17"
  },
  {
    "url": "index.html",
    "revision": "da55f28c1443b484bd283b59eb0694c3"
  },
  {
    "url": "instanceMethods/data.html",
    "revision": "fb14653ffadcd2eaab6e15439c46fd53"
  },
  {
    "url": "instanceMethods/event.html",
    "revision": "a5cf3154cd50bbc9704b8c6e1c87a928"
  },
  {
    "url": "instanceMethods/lifecycle.html",
    "revision": "f7fb89feef8e50183248278e2d99252d"
  },
  {
    "url": "lifecycle/destory.html",
    "revision": "f6003f0622114b18b7a67ed8005a13d4"
  },
  {
    "url": "lifecycle/index.html",
    "revision": "4906b9c1fa7ee5598ac08aa8a2728d7e"
  },
  {
    "url": "lifecycle/initEvents.html",
    "revision": "9a6d7db058f3150a1a7979ca8373c454"
  },
  {
    "url": "lifecycle/initInjections.html",
    "revision": "28d7e3955f4bb5f4847306ae505cdd46"
  },
  {
    "url": "lifecycle/initLifecycle.html",
    "revision": "875ad8a7d795f88075c30406f2b42b16"
  },
  {
    "url": "lifecycle/initState.html",
    "revision": "3f8299682fbb42ec8be33f7160dde404"
  },
  {
    "url": "lifecycle/mount.html",
    "revision": "9ea9855cba8bb1bced7c826212785628"
  },
  {
    "url": "lifecycle/newVue.html",
    "revision": "b07f6040048c079b01e479839ad3bb11"
  },
  {
    "url": "lifecycle/templateComplie.html",
    "revision": "54ee55c379a4ebb1d38053d21f9fe893"
  },
  {
    "url": "logo.png",
    "revision": "cf23526f451784ff137f161b8fe18d5a"
  },
  {
    "url": "reactive/array.html",
    "revision": "260bb4085095bc3687ff90092065e054"
  },
  {
    "url": "reactive/index.html",
    "revision": "5cb9de70ad36f772090ac7d9611efea3"
  },
  {
    "url": "reactive/object.html",
    "revision": "7e371f169c632bc746893ecc5c72815c"
  },
  {
    "url": "start/index.html",
    "revision": "99e60ecd83893c5f1bf48182014c6594"
  },
  {
    "url": "virtualDOM/index.html",
    "revision": "793d41659804150807f7f390caa70296"
  },
  {
    "url": "virtualDOM/optimizeUpdataChildren.html",
    "revision": "b0404eb51e0e793d650e604c013a8581"
  },
  {
    "url": "virtualDOM/patch.html",
    "revision": "ffbee69dcc00ddcac1b46274bfed5448"
  },
  {
    "url": "virtualDOM/updataChildren.html",
    "revision": "cd051ece75c740e4dd247bb58544be7b"
  }
].concat(self.__precacheManifest || []);
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});
addEventListener('message', event => {
  const replyPort = event.ports[0]
  const message = event.data
  if (replyPort && message && message.type === 'skip-waiting') {
    event.waitUntil(
      self.skipWaiting().then(
        () => replyPort.postMessage({ error: null }),
        error => replyPort.postMessage({ error })
      )
    )
  }
})

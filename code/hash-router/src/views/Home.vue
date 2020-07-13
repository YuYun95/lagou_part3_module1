<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/logo.png">
    <HelloWorld msg="Welcome to Your Vue.js App"/>
  </div>
</template>

<script>
// @ is an alias to /src
import HelloWorld from '@/components/HelloWorld.vue'

export default {
  name: 'Home',
  components: {
    HelloWorld
  },
  data(){
    return {
      title: '标题'
    }
  },
  mounted(){
    console.log('$router', this.$router)
    console.log('$ror', this.$route)
  },
  methods:{
    handleClick(){
      console.log('点击函数',this.title)
    }
  }
}
</script>

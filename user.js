import { login, logout, getInfo } from "@/api/user";
import { getToken, setToken, removeToken } from "@/utils/auth";
import router, { resetRouter } from "@/router";

/* 
    commit => mutations,用来触发同步操作的方法。
    dispatch => actions,用来触发异步操作的方法。
    在 store 中注册了 mutation 和 action,在组件中用 dispatch 调用 action,然后 action 用 commit 调用 mutation

    改变 store 中的状态的唯一途径就是 显式地提交 (commit) mutation。
    this.$store.dispatch()   异步操作
    this.$store.commit()   同步操作
*/

const state = {
  token: getToken(),
  name: "",
  avatar: "",
  introduction: "",
  roles: [],
};

const mutations = {
  SET_TOKEN: (state, token) => {
    state.token = token;
  },
  SET_INTRODUCTION: (state, introduction) => {
    state.introduction = introduction;
  },
  SET_NAME: (state, name) => {
    state.name = name;
  },
  SET_AVATAR: (state, avatar) => {
    state.avatar = avatar;
  },
  SET_ROLES: (state, roles) => {
    state.roles = roles;
  },
};

const actions = {
  // user login
  login({ commit }, userInfo) {
    const { username, password } = userInfo;
    return new Promise((resolve, reject) => {
      login({ username: username.trim(), password: password })
        .then((response) => {
          const { data } = response;
          commit("SET_TOKEN", data.token);
          setToken(data.token);
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  // get user info
  getInfo({ commit, state }) {
    return new Promise((resolve, reject) => {
      getInfo(state.token)
        .then((response) => {
          const { data } = response;

          if (!data) {
            reject("Verification failed, please Login again.");
          }

          const { roles, name, avatar, introduction } = data;

          // roles must be a non-empty array   ['admin']
          if (!roles || roles.length <= 0) {
            reject("getInfo: roles must be a non-null array!");
          }

          commit("SET_ROLES", roles);
          commit("SET_NAME", name);
          commit("SET_AVATAR", avatar);
          commit("SET_INTRODUCTION", introduction);
          resolve(data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  // user logout
  logout({ commit, state, dispatch }) {
    return new Promise((resolve, reject) => {
      logout(state.token)
        .then(() => {
          commit("SET_TOKEN", "");
          commit("SET_ROLES", []);
          removeToken();
          resetRouter();

          // reset visited views and cached views
          // to fixed https://github.com/PanJiaChen/vue-element-admin/issues/2485
          dispatch("tagsView/delAllViews", null, { root: true });

          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  // remove token
  resetToken({ commit }) {
    return new Promise((resolve) => {
      commit("SET_TOKEN", "");
      commit("SET_ROLES", []);
      removeToken();
      resolve();
    });
  },

  // dynamically modify permissions
  async changeRoles({ commit, dispatch }, role) {
    const token = role + "-token";

    commit("SET_TOKEN", token);
    setToken(token);

    const { roles } = await dispatch("getInfo");

    resetRouter();

    // generate accessible routes map based on roles
    const accessRoutes = await dispatch("permission/generateRoutes", roles, {
      root: true,
    });
    // dynamically add accessible routes
    router.addRoutes(accessRoutes);

    // reset visited views and cached views
    dispatch("tagsView/delAllViews", null, { root: true });
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};

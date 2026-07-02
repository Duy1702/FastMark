import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  changeCurrentUserPassword,
  getCurrentFirebaseUser,
  loginWithEmail,
  logoutCurrentUser,
  registerWithEmail,
  serializeAuthUser,
  signInWithFacebookCredential,
  signInWithGoogleCredential,
  updateCurrentUserProfile,
} from '../../services/authService';
import { getBackendConfigError } from '../../services/env';
import { readUserProfile, upsertUserProfile } from '../../services/profileService';
import { toReadableAuthError } from './authErrors';

const initialState = {
  status: 'checking',
  actionStatus: 'idle',
  user: null,
  profile: null,
  error: null,
  successMessage: null,
  configError: null,
};

function rejectWithReadableError(error, rejectWithValue) {
  return rejectWithValue(toReadableAuthError(error));
}

export const hydrateAuthSession = createAsyncThunk(
  'auth/hydrateSession',
  async (_, { rejectWithValue }) => {
    try {
      const configError = getBackendConfigError();

      if (configError) {
        throw new Error(configError);
      }

      const firebaseUser = getCurrentFirebaseUser();

      if (!firebaseUser) {
        return { user: null, profile: null };
      }

      const user = serializeAuthUser(firebaseUser);
      const profile = await readUserProfile(user);

      return { user, profile };
    } catch (error) {
      return rejectWithReadableError(error, rejectWithValue);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (payload, { rejectWithValue }) => {
    try {
      const configError = getBackendConfigError();

      if (configError) {
        throw new Error(configError);
      }

      const user = await registerWithEmail(payload);
      const profile = await upsertUserProfile(user, {
        fullName: payload.fullName,
        phone: payload.phone,
        photoUrl: payload.photoUrl,
      });

      return { user, profile, message: 'Đăng ký thành công.' };
    } catch (error) {
      return rejectWithReadableError(error, rejectWithValue);
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (payload, { rejectWithValue }) => {
    try {
      const configError = getBackendConfigError();

      if (configError) {
        throw new Error(configError);
      }

      const user = await loginWithEmail(payload);
      const profile = await upsertUserProfile(user);

      return { user, profile, message: 'Đăng nhập thành công.' };
    } catch (error) {
      return rejectWithReadableError(error, rejectWithValue);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await logoutCurrentUser();
    } catch (error) {
      return rejectWithReadableError(error, rejectWithValue);
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const currentProfile = getState().auth.profile;
      const user = await updateCurrentUserProfile(payload);
      const profile = await upsertUserProfile(user, {
        ...currentProfile,
        ...payload,
      });

      return { user, profile, message: 'Đã cập nhật thông tin.' };
    } catch (error) {
      return rejectWithReadableError(error, rejectWithValue);
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (payload, { rejectWithValue }) => {
    try {
      await changeCurrentUserPassword(payload);

      return { message: 'Đã đổi mật khẩu.' };
    } catch (error) {
      return rejectWithReadableError(error, rejectWithValue);
    }
  }
);

export const socialLogin = createAsyncThunk(
  'auth/socialLogin',
  async ({ provider, token }, { rejectWithValue }) => {
    try {
      const configError = getBackendConfigError();
      if (configError) throw new Error(configError);

      let user;
      if (provider === 'google') {
        user = await signInWithGoogleCredential(token);
      } else if (provider === 'facebook') {
        user = await signInWithFacebookCredential(token);
      } else {
        throw new Error('Nhà cung cấp xác thực không hợp lệ.');
      }

      const profile = await upsertUserProfile(user);
      return { user, profile, message: 'Đăng nhập thành công.' };
    } catch (error) {
      return rejectWithReadableError(error, rejectWithValue);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthChecking(state) {
      state.status = 'checking';
      state.error = null;
      state.successMessage = null;
    },
    setConfigError(state, action) {
      state.status = 'unauthenticated';
      state.configError = action.payload;
      state.error = action.payload;
      state.successMessage = null;
    },
    clearAuthFeedback(state) {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateAuthSession.pending, (state) => {
        state.status = 'checking';
        state.error = null;
      })
      .addCase(hydrateAuthSession.fulfilled, (state, action) => {
        state.status = action.payload.user ? 'authenticated' : 'unauthenticated';
        state.user = action.payload.user;
        state.profile = action.payload.profile;
        state.error = null;
        state.configError = null;
      })
      .addCase(hydrateAuthSession.rejected, (state, action) => {
        state.status = 'unauthenticated';
        state.user = null;
        state.profile = null;
        state.error = action.payload;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.status = 'unauthenticated';
        state.actionStatus = 'idle';
        state.user = null;
        state.profile = null;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.actionStatus = 'idle';
        state.error = null;
        state.successMessage = action.payload.message;
      })
      .addMatcher(
        (action) =>
          [
            registerUser.pending.type,
            loginUser.pending.type,
            logoutUser.pending.type,
            updateUserProfile.pending.type,
            changePassword.pending.type,
            socialLogin.pending.type,
          ].includes(action.type),
        (state) => {
          state.actionStatus = 'loading';
          state.error = null;
          state.successMessage = null;
        }
      )
      .addMatcher(
        (action) =>
          [
            registerUser.fulfilled.type,
            loginUser.fulfilled.type,
            updateUserProfile.fulfilled.type,
            socialLogin.fulfilled.type,
          ].includes(action.type),
        (state, action) => {
          state.status = 'authenticated';
          state.actionStatus = 'idle';
          state.user = action.payload.user;
          state.profile = action.payload.profile;
          state.error = null;
          state.successMessage = action.payload.message;
        }
      )
      .addMatcher(
        (action) =>
          [
            registerUser.rejected.type,
            loginUser.rejected.type,
            logoutUser.rejected.type,
            updateUserProfile.rejected.type,
            changePassword.rejected.type,
            socialLogin.rejected.type,
          ].includes(action.type),
        (state, action) => {
          state.actionStatus = 'idle';
          state.error = action.payload;
          state.successMessage = null;
        }
      );
  },
});

export const { clearAuthFeedback, setAuthChecking, setConfigError } =
  authSlice.actions;

export default authSlice.reducer;

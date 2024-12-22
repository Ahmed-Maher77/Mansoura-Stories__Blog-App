import {
	signInWithPopup,
	signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
	onSnapshot,
	addDoc,
	deleteDoc,
	doc,
	query,
	where,
	orderBy,
	serverTimestamp,
	getDoc,
	updateDoc,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { auth, provider, db, colRef} from "./firebase-config.js";

// ("======================================================================================");

// Get User's Authentication Data
let authData = auth.currentUser;
if (auth) {
    onAuthStateChanged(auth, (user) => {
    if (user) {
            authData = user;
            getUserPosts()
    } else {
        console.log("No user is logged in.");
    }
    });
} else {
    console.error("Firebase auth is not initialized.");
}

// ("======================================================================================");

// Sign In with Google
const googleLoginButton = document.querySelector(".google-login");
let isAuth = localStorage.getItem("isAuth") === "true" || false;
googleLoginButton?.addEventListener("click", () => {
	signInWithPopup(auth, provider)
		.then((result) => {
			window.location.pathname = "/";
			localStorage.setItem("isAuth", true);
			isAuth = true;
			manageLoginVisibility();
			managecreatePostVisibility();
			manageDashboardVisibility();
		})
		.catch((error) => {
			console.error("Error during sign-in:", error.message);
		});
});

// ("======================================================================================");

// Logging Out
const logoutButton = document.querySelector(".google-logout");
logoutButton.addEventListener("click", () => {
	signOut(auth)
		.then(() => {
			isAuth = false;
			localStorage.setItem("isAuth", false);
			manageLoginVisibility();
			manageDashboardVisibility();
			managecreatePostVisibility();
		})
		.catch((_) => null);
});

// ("======================================================================================");

// Manage Navbar Login Visibility
const navbarContainer = document.querySelector("#navbar .container");
const loginLink = document.querySelector(".login-link");
const logoutBtn = document.querySelector(".google-logout");
function manageLoginVisibility() {
	if (isAuth) {
		loginLink.style.display = "none";
		logoutBtn.style.display = "inline-block";
		navbarContainer.style.justifyContent = "space-between";
	} else {
		loginLink.style.display = "inline-block";
		logoutBtn.style.display = "none";
		navbarContainer.style.justifyContent = "center";
	}
}
manageLoginVisibility();

// ("======================================================================================");

// Manage visibility of createPost Page
const notAuthorizedMsg = document.querySelector(".not-authorized");
const createPostForm = document.querySelector(".createPost form");
function managecreatePostVisibility() {
	if (isAuth) {
		notAuthorizedMsg.style.display = "none";
		createPostForm.style.display = "flex";
	} else {
		notAuthorizedMsg.style.display = "flex";
		createPostForm.style.display = "none";
	}
}
location.pathname === "/pages/createPost.html" && managecreatePostVisibility();

// ("======================================================================================");

// Create a Post
const withinCreatePost = location.pathname === "/pages/createPost.html";
const imageInput = document.getElementById("image");
const imageContainer = document.querySelector(".createPost form figure");
let formSubmitLoading = false;

if (withinCreatePost && isAuth) {
	const submitBtn = document.querySelector(".submit-btn");
	submitBtn.addEventListener("click", formValidation);
	createPostForm.addEventListener("submit", handleSubmit);
    
    async function handleSubmit(e) {
        e.preventDefault();
		const postTitle = createPostForm.title.value.trim();
		const postImage = createPostForm.image.files[0];
		const postContent = createPostForm.content.value.trim();
        
		const { isPostTitleValid, isPostContentValid, isPostImageValid } = formValidation();
        
		if (isPostTitleValid && isPostContentValid && isPostImageValid) {
            formSubmitLoading = true;
            toggleFormLoading();

            const imageURL = await uploadImage(postImage);

            // Add new post to Firestore
            addDoc(colRef, {
                title: postTitle,
                content: postContent,
                image: imageURL,
                author: {
                    name: auth.currentUser.displayName,
                    id: auth.currentUser.uid,
                },
                createdAt: serverTimestamp(),
            })
            .then(() => {
                createPostForm.reset();
                imageContainer.style.display = "none";
            })
            .catch((_) => alert("Failed to create a post. Please try again later."));

            formSubmitLoading = false;
            toggleFormLoading();
        }
    }
        
        const formInputs = [createPostForm.title, createPostForm.content, createPostForm.image];
        
        formInputs?.forEach((input) => {
            input.oninput = () => formValidation();
        });
}

// Validate inputs and Handle form errors
function formValidation() {
    let isPostTitleValid = false;
    let isPostContentValid = false;
    let isPostImageValid = false;
    const postTitle = createPostForm.title.value.trim();
    const postContent = createPostForm.content.value.trim();
    const postImage = createPostForm.image.files;
    const titleErrorMsg = document.querySelector(".error-msg.title");
    const contentErrorMsg = document.querySelector(".error-msg.content");
    const ImageErrorMsg = document.querySelector(".error-msg.image");

    isPostTitleValid = checkInputValidation(postTitle, 8, titleErrorMsg);
    isPostContentValid = checkInputValidation(postContent, 10, contentErrorMsg);
    isPostImageValid = checkInputValidation(postImage, 1, ImageErrorMsg);

    return {
        isPostTitleValid, isPostContentValid, isPostImageValid
    }
}

function checkInputValidation(input, length, element) {
    if (input.length >= length) {
        element.style.display = "none";
        return true;
    } else {
        element.style.display = "flex";
        return false;
    }
}

function toggleFormLoading() {    
    const submitBtn = document.querySelector(".createPost form .submit-btn");

    if (formSubmitLoading) {
        // Disable Submit button
        submitBtn.setAttribute("disabled", true);
        submitBtn.innerText = 'Loading...';
    } else {
        // Reset Submit button
        submitBtn.removeAttribute("disabled");
        submitBtn.innerText = 'Create a Post';
    }
}

// ("======================================================================================");

// Handle Image Upload in Form
if (withinCreatePost) {
    imageInput.onchange = async (e) => {
        const file = e.target.files[0];
        const imageURL = await uploadImage(file);
        imageContainer.style.display = "block";
        const imagePreview = imageContainer.querySelector(".post-image-preview");
        if (file) {
            imagePreview.src = imageURL;
        }
    };
    imageContainer.onclick = () => imageInput.click();
}

// Upload an image on Cloudinary
const imageLoader = document.querySelector('.image-loader');
let imageLoading = false;
async function uploadImage(image) {
    if (image) {
        imageLoading = true;
        manageLoader();
        const data = new FormData();
        data.append('file', image);
        data.append('upload_preset', "mansoura-stories__blog-app");
        data.append('cloud_name', "djpxtccbf");   
        const res = await fetch("https://api.cloudinary.com/v1_1/djpxtccbf/image/upload", {
            method: "POST",
            body: data,
        });
        const uploadImageUrl = await res.json();
        imageLoading = false;
        manageLoader();
        return uploadImageUrl.url;
    }
}

// Show or hide loader
function manageLoader() {
    imageLoader.style.display = imageLoading ? 'flex' : 'none';
}

// ("======================================================================================");

// Fetch and Display Posts ordered by timestamp (Home Page)
const postsContainer = document.querySelector(".posts .container");
const withinHomePage = location.pathname === "/";
let posts;
const q = query(colRef, orderBy('createdAt'));
if (withinHomePage) {
    onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            displayPosts(posts);
        } else {
            displayEmptyState(postsContainer, "No posts found.");
        }
    }, (error) => displayError(postsContainer, error));
}

function displayEmptyState(container, message) {
    container.innerHTML = `<p style='text-align: center; font-size: 1.4rem'>${message}</p>`;
}

function displayError(container, error) {
    container.style.alignItems = "center";
    container.innerHTML = `<p style='text-align: center; color: red; font-size: 1.4rem'>An error occurred: <br/><b>${error.message}</b></p>`;
}

// ("======================================================================================");

// Create and display posts
function displayPosts(data) {
    const fragment = document.createDocumentFragment();
    postsContainer.style.alignItems = "baseline";

    data.forEach(post => {
        const figure = document.createElement("figure");
        figure.setAttribute("data-id", post.id);
        figure.innerHTML = `
            <figure data-id="${post.id}">
                <div class="img-wrapper">
                    <img src="${post.image}" alt="${post.title}" role="img" aria-label="${post.title}" loading="lazy">
                    <div class="figure-overlay">Read More <i class="fa-solid fa-arrow-up-right-from-square"></i></div>
                </div>
                <figcaption>
                    <h3>${clipText(post.title, 70)}</h3>
                    <p>
                        <span>Posted by <b>${post.author.name}</b></span>
                        <span><i class="fa-regular fa-clock"></i> ${getDateFormat(post.createdAt)}</span>
                    </p>
                </figcaption>
            </figure>
        `;
        fragment.appendChild(figure);
    });

    postsContainer.innerHTML = ''; // Clear existing posts
    postsContainer.appendChild(fragment);
    openPost(postsContainer)
}

// ("======================================================================================");

// Format date from Firestore Timestamp [DD/MM/YYYY]
function getDateFormat(timestamp) {
    const date = timestamp.toDate();
    const day = String(date.getDate()).padStart(2, '0');   
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    return formattedDate
}

// Limit text length for title
function clipText(text, maxLength) {
    return text.length > maxLength? `${text.slice(0, maxLength)}...` : text.slice(0, maxLength);
}

// ("======================================================================================");

// Handle post click to open detailed view
function openPost(postsWrapper) {
    let figures;
    figures = postsWrapper.querySelectorAll(withinDashboard ? "#dashboard-page .img-wrapper" : "#home-page figure");

    figures.forEach((fig) => {
        // Remove any existing click listeners to avoid duplication
        fig.onclick = null;
        fig.onclick = function() {
            const postId = withinDashboard ? fig.parentElement.getAttribute("data-id") : fig.getAttribute("data-id");
            const clickedPost = withinDashboard ? userPosts.find(post => post.id === postId) : posts.find(post => post.id === postId);
            createPopupPost(clickedPost);
        }
    });
}

// ("======================================================================================");

// Create and show popup for a post
const body = document.body;
function createPopupPost(postData) {
    const popupWraper = document.createElement('div');
	popupWraper.classList.add('popup-wraper');
	popupWraper.innerHTML = `
			<div class="popup-container">
				<div class="popup">
                    <header>
                        <h2>${postData.title}</h2>
                    </header>
					<div class="popup-body">
                        <img src="${postData.image}" alt="${postData.title}" loading="lazy">
                        <p>
                        <span>
                        <i class="fa-solid fa-user-pen"></i>
                        <cite>${postData.author.name}</cite>
                        </span>
                        <span>
                        <i class="fa-solid fa-clock"></i>
                        ${getDateFormat(postData.createdAt)}
                        </span>
                        </p>
                        <hr />
                        <pre>${postData.content}</pre>
					</div>
					<div class="close-btn">
						<span class="fa-solid fa-xmark"></span>
					</div>
				</div>
			</div>
    `

	body.append(popupWraper);
	body.classList.add('no-scroll');
    postHeadWhenScroll();
	closePopupPost();
}

// Close popup post
function closePopupPost() {
    const closeButton = document.querySelector('.close-btn');
    const popup = document.querySelector('.popup-wraper');
    closeButton.onclick = () => {
        popup.remove();
		body.classList.remove('no-scroll');
    }
}

// ("======================================================================================");

// Add shadow to header when popup content scrolls
function postHeadWhenScroll() {
    const popupBody = document.querySelector('.popup-body');
    const popupHeader = document.querySelector('.popup-wraper header');
    popupBody.onscroll = function() {
        const bodyScroll = popupBody.scrollTop;
        popupHeader.classList.toggle('shadow', bodyScroll > 50);
    }
}

// ("======================================================================================");

// Manage visibility of the Dashboard Page based on authentication
const postsSection = document.querySelector("#dashboard-page .my-posts");
function manageDashboardVisibility() {
	if (isAuth) {
		notAuthorizedMsg.style.display = "none";
		postsSection.style.display = "flex";
	} else {
		notAuthorizedMsg.style.display = "flex";
		postsSection.style.display = "none";
	}
}
location.pathname === "/pages/dashboard.html" && manageDashboardVisibility();

// ("======================================================================================");

// Dashboard: Fetch User's Posts
const withinDashboard = location.pathname === "/pages/dashboard.html";
const userPostsContainer = document.querySelector('.my-posts .container');
let userPosts;

function getUserPosts() {
    const qUserPosts = query(colRef, where("author.id", "==", authData.uid), orderBy('createdAt'));
    if (withinDashboard || withinCreatePost) {
        onSnapshot(qUserPosts, (snapshot) => {
            if (!snapshot.empty) {
                userPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (withinDashboard) renderUserPosts(userPosts);
                if (withinCreatePost) prefillPostForm();
            } else {
                userPostsContainer.style.justifyContent = "center";
                userPostsContainer.innerHTML = "<p style='text-align: center; font-size: 1.4rem'>No posts found.</p>";
            }
        }, (error) => {
            userPostsContainer.style.justifyContent = "center";
            userPostsContainer.innerHTML = `<p style='text-align: center; color: red; font-size: 1.4rem'>An error occurred: <br/><b>${error.message}</b></p>`;
        });
    }
}

// ("======================================================================================");

// Create and display user posts in dashboard
function renderUserPosts(data) {
    const fragment = document.createDocumentFragment();
    data.forEach(post => {
        const figure = document.createElement('figure');
        figure.setAttribute('data-id', post.id);
        figure.innerHTML = `
            <div class="img-wrapper">
                <img src="${post.image}" alt="${post.title}">
                <div class="figure-overlay">Read More <i class="fa-solid fa-arrow-up-right-from-square"></i></div>
            </div>
            <figcaption>
                <h3>${clipText(post.title, 260)}</h3>
            </figcaption>
            <footer>
                <button type="button" class="edit-post">Edit</button>
                <button type="button" class="delete-post">Delete</button>
            </footer>
        `;
        fragment.appendChild(figure);
    });
    userPostsContainer.innerHTML = ''; // Clear container once
    userPostsContainer.appendChild(fragment); // Append all at once
    deletePost(userPostsContainer);
    editPost(userPostsContainer);
    openPost(userPostsContainer);
}


// ("======================================================================================");

// Delete a user post
function deletePost(userPostsContainer) {
    const figures = userPostsContainer.querySelectorAll("figure");
    figures.forEach((fig) => {
        fig.querySelector(".delete-post").onclick = function() {
            const postId = fig.getAttribute("data-id");
            confirmDeletion(() => {
                const docRef = doc(db, 'posts', postId);
                deleteDoc(docRef)
                    .then(() => Swal.fire("Success!", "Post deleted successfully!", "success"))
                    .catch(error => Swal.fire("Error!", `Failed to delete: ${error.message}`, "error"));
            });
        }
    });
}

// Confirm before deleting a post
function confirmDeletion(deleteFunction) {
    Swal.fire({
        title: "Are you sure?",
        text: "This action cannot be undone!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
    }).then((result) => {
        if (result.isConfirmed) deleteFunction();
    });
}

// ("======================================================================================");

// Edit a user post
function editPost(userPostsContainer) {
    const figures = userPostsContainer.querySelectorAll("figure");
    figures.forEach((fig) => {
        fig.querySelector(".edit-post").onclick = function() {
            const postId = fig.getAttribute("data-id");
            localStorage.setItem("post-id-to-edit", postId);
            window.location.pathname = '/pages/createPost.html';
        }
    });
}

// Fill form with post data for editing
function prefillPostForm() {
    const postIdToEdit = localStorage.getItem("post-id-to-edit");
    if (postIdToEdit) {
        // update page heading
        const pageTitle = document.querySelector('.createPost form > h2');
        pageTitle.innerHTML = "Update a Post <i class='fa-solid fa-arrows-rotate'></i>";

        // update button
        const editButton = document.querySelector(".createPost .submit-btn");
        editButton.innerText = "Update Post";
        editButton.style.backgroundColor = "green";
        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Cancel";
        cancelBtn.className = "cancel-btn";
        editButton.insertAdjacentElement('afterend', cancelBtn);

        // fill form fields with the post data
        const postData = userPosts.find(post => post.id === postIdToEdit);
        const form = document.querySelector(".createPost form");
        form.querySelector(".post-image-preview").src = postData.image;
        form.title.value = postData.title;
        form.content.value = postData.content;
        const imageUrl = postData.image;
        const imageInput = form.image;
        assignImageToInput(imageUrl, imageInput)
        
        handleUpdate(postIdToEdit);
        document.querySelector(".cancel-btn").onclick = (e) => {
            e.preventDefault();
            cancelChanges();
        };
    }
}

// To assign the image to the input element via JS
function assignImageToInput(imageUrl, imageInput) {
    // Fetch the image as a Blob
    fetch(imageUrl)
    .then(response => response.blob())  // Convert the image URL to a Blob
    .then(blob => {
        // Create a File object from the Blob (you can name it anything)
        const file = new File([blob], 'image.jpg', { type: blob.type });
        // Create a DataTransfer object to hold the file
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        // Assign the file to the file input's files property
        imageInput.files = dataTransfer.files;
        // Optionally trigger the change event to notify the system that the file has been "selected"
        imageInput.dispatchEvent(new Event('change'));
        console.log('File has been set in the input:', file);
    })
    .catch(error => {
        console.error('Error fetching the image:', error);
    });
}


function handleUpdate(postIdToEdit) {
    const updateForm = document.querySelector('.createPost form');
    const updateBtn = document.querySelector(".submit-btn");

	updateBtn.addEventListener("click", formValidation);
	updateForm.addEventListener("submit", handleSubmit);

    
    async function handleSubmit(e) {
        e.preventDefault();
		const postTitle = updateForm.title.value.trim();
		const postImage = updateForm.image.files[0];
		const postContent = updateForm.content.value.trim();

        const { isPostTitleValid, isPostContentValid, isPostImageValid } = formValidation();
        
		if (isPostTitleValid && isPostContentValid && isPostImageValid) {
            formSubmitLoading = true;
            toggleFormLoading();

            try {
                const imageURL = await uploadImage(postImage);
                const docRef = doc(db, 'posts', postIdToEdit);
                await updateDoc(docRef, {
                    title: postTitle,
                    content: postContent,
                    image: imageURL,
                });
                console.log("Document updated successfully!");
                removeCreatePostPageChanges();
            } catch (error) {
                console.error("Error updating document: ", error);
            } finally {
                formSubmitLoading = false;
                toggleFormLoading();
            }
        }
		}

	const formInputs = [createPostForm.title, createPostForm.content, createPostForm.image];
	formInputs?.forEach((input) => {
		input.oninput = () => formValidation();
	});


    function removeCreatePostPageChanges() {
        // Reset form values
        updateForm.reset();
        // Reset image preview
        imageContainer.style.display = "none";
        // Reset error messages
        formInputs.forEach((input) => {
            const errorMsg = document.querySelector(`.error-msg.${input.name}`);
            errorMsg.style.display = "none";
        });
        localStorage.removeItem("post-id-to-edit");
        window.location.pathname = '/pages/dashboard.html';
    }
}

function cancelChanges() {
    Swal.fire({
        title: "Do you want to ignore changes?",
        text: "This action cannot be undone!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, ignore them!", 
        cancelButtonText: "Continue editing",
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem("post-id-to-edit");
            window.location.pathname = '/pages/dashboard.html';
        } 
        else if (result.dismiss === Swal.DismissReason.cancel) {
            console.log('canceled');
        }
    });
}




// Check Internet Connection + go to components






/**
 * 
 * 
 * 
 * 
 *  
 * 
 * 
 * 
 * 
 * 
 * How can I choose the most suitable programming language to me?
 * Internet History - A quick look back
 * How to handle the client
 * How to convert your idea to code
 * 
 * 
 * 
 * 
 * 
 * 
 * Load More Button (posts) >> show 10 [try select using firebase]
 * comments >> 
 * 
 */
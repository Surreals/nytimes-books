const API_KEY = "OjhudDfxvnOSOh1A60TZl8JRB4BcokrQ";
const PAGE_SIZE = 20;

let currentPage = -1;
let isLoading = false;
let hasMoreBooks = true;

const booksList = $("#booksList");
const categoriesDropdown = $("#categoriesDropdown");
const datePicker = $("#datePicker");
const bookDetailsModal = $("#bookDetailsModal");
const modalBody = bookDetailsModal.find(".modal-body");

$(document).ready(function () {
  initializeSelectPicker();
  initializeDatePicker();
  loadCategoryData();
  registerEventListeners();
});

function registerEventListeners() {
  categoriesDropdown.add(datePicker).change(refetchBooks);

  $(window).scroll(debounce(checkScrollPosition, 250));

  booksList.on("click", ".book-item", displayBookDetails);
}

function checkScrollPosition() {
  if (isLoading || !hasMoreBooks) return;

  if ($(window).scrollTop() + $(window).height() >= $(document).height()) {
    loadBooks();
  }
}

function initializeSelectPicker() {
  $(".selectpicker").selectpicker();
}

function initializeDatePicker() {
  datePicker.datepicker({
    format: "yyyy-mm-dd",
    autoclose: true,
    todayHighlight: true,
    endDate: "0d",
  });
}

function debounce(func, wait, immediate) {
  let timeout;
  return function () {
    const context = this,
      args = arguments;
    const later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

function loadCategoryData() {
  $.ajax({
    url: `https://api.nytimes.com/svc/books/v3/lists/names.json?api-key=${API_KEY}`,
    method: "GET",
    success: function (data) {
      populateCategoriesDropdown(data.results);
      $(".selectpicker").selectpicker("refresh");
      loadBooks();
    },
  });
}

function populateCategoriesDropdown(categories) {
  categories.forEach((category) => {
    categoriesDropdown.append(
      new Option(category.display_name, category.list_name_encoded)
    );
  });
  $(".selectpicker").selectpicker("refresh");
}

function fetchBooks(selectedCategory, selectedDate) {
  $.ajax({
    url: `https://api.nytimes.com/svc/books/v3/lists/${selectedDate}/${selectedCategory}.json?api-key=${API_KEY}&offset=${
      currentPage * PAGE_SIZE
    }`,
    method: "GET",
    success: updateBooksList,
    error: () => {
      isLoading = false; // Handle error
    },
  });
}

function updateBooksList(data) {
  booksList.empty(); // Remove skeletons when loading actual data
  if (!data.results.books || data.results.books.length === 0) {
    hasMoreBooks = false;
  } else {
    data.results.books.forEach((book) =>
      booksList.append(createBookElement(book))
    );
    hasMoreBooks = data.num_results >= PAGE_SIZE;
  }
  isLoading = false;
  if (!hasMoreBooks) currentPage--;
}

function loadBooks() {
  if (isLoading || !hasMoreBooks) return;
  isLoading = true;
  currentPage++;
  showSkeletons(10); // Show 10 skeletons
  fetchBooks(categoriesDropdown.val(), datePicker.val() || "current");
}

function refetchBooks() {
  currentPage = -1;
  hasMoreBooks = true;
  booksList.empty();
  loadBooks();
}

function showSkeletons(count) {
  booksList.empty(); // Clear current content or skeletons
  for (let i = 0; i < count; i++) {
    booksList.append(`
            <div class="col-lg-3 col-md-4 col-sm-6 col-12 mb-4 skeleton">
                <div class="skeleton-img"></div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-author"></div>
                <div class="skeleton skeleton-publisher"></div>
            </div>
        `);
  }
}

function createBookElement(book) {
  return `
    <div class="col-lg-3 col-md-4 col-sm-6 col-12 mb-4 book-item"
    data-isbn="${book.primary_isbn13}"
    data-cover="${book.book_image}"
    data-title="${book.title}"
    data-author="${book.author}"
    data-publisher="${book.publisher}"
    data-buy-links='${JSON.stringify(book.buy_links)}'>
    <div class="card">
    <img src="${book.book_image}" alt="${book.title}" class="card-img-top">
    <div class="card-body">
    <h5 class="card-title">${book.title}</h5>
    <p class="card-text">by ${book.author}</p>
    </div>
    </div>
    </div>
    `;
}

function displayBookDetails() {
  const element = $(this);
  const bookDetails = getBookDetailsFromElement(element);

  populateModalBody(modalBody, bookDetails);
  fetchAndDisplayReviews(bookDetails.isbn);

  bookDetailsModal.modal("show");
}

function getBookDetailsFromElement(element) {
  return {
    cover: element.data("cover"),
    title: element.data("title"),
    author: element.data("author"),
    publisher: element.data("publisher"),
    buyLinks: element.data("buy-links") || [],
    isbn: element.data("isbn"),
  };
}

function populateModalBody(modalBody, bookDetails) {
  const buyLinksHtml = bookDetails.buyLinks
    .map(
      (link) =>
        `<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="d-block">${link.name}</a>`
    )
    .join("");

  modalBody.html(`
        <div class="text-center">
            <img src="${bookDetails.cover}" alt="${bookDetails.title}" class="img-fluid">
        </div>
        <h5 class="mt-3">${bookDetails.title}</h5>
        <p><strong>Author:</strong> ${bookDetails.author}</p>
        <p><strong>Publisher:</strong> ${bookDetails.publisher}</p>
        <div id="buyLinks" class="mt-3"><h6>Buy Links:</h6>${buyLinksHtml}</div>
        <div id="bookReviews" class="mt-3"></div>
    `);
}

function fetchBookReviews(isbn) {
  return $.ajax({
    url: `https://api.nytimes.com/svc/books/v3/reviews.json?isbn=${isbn}&api-key=${API_KEY}`,
    method: "GET",
  });
}

function fetchAndDisplayReviews(isbn) {
    const bookReviewsContainer = $("#bookReviews");
    // Display a loading message or spinner
    bookReviewsContainer.html('<p class="text-center">Loading reviews...</p>');
    
    fetchBookReviews(isbn).done(function(response) {
        // Once the data is fetched, replace the loading message with actual content
        const reviewsContent = response.results.map(review => `<p>${review.summary}</p>`).join("") || "Not Found";
        bookReviewsContainer.html(`<h6>Reviews:</h6>${reviewsContent}`);
    }).fail(function() {
        // In case of an error, update the content to indicate the failure
        bookReviewsContainer.html("<p>Reviews are not available.</p>");
    });
}


// TODO
// add hovers
// add author to reviews